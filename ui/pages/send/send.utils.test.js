import { rawEncode } from 'ethereumjs-abi';

import {
  multiplyCurrencies,
  addCurrencies,
  conversionGTE,
  conversionUtil,
} from '../../helpers/utils/conversion-util';

import {
  calcGasTotal,
  doesAmountErrorRequireUpdate,
  generateTokenTransferData,
  getAmountErrorObject,
  getGasFeeErrorObject,
  getToAddressForGasUpdate,
  calcTokenBalance,
  isBalanceSufficient,
  isTokenBalanceSufficient,
  removeLeadingZeroes,
} from './send.utils';

import {
  INSUFFICIENT_FUNDS_ERROR,
  INSUFFICIENT_TOKENS_ERROR,
} from './send.constants';

jest.mock('../../helpers/utils/conversion-util', () => ({
  addCurrencies: jest.fn((a, b) => {
    let [a1, b1] = [a, b];
    if (String(a).match(/^0x.+/u)) {
      a1 = Number(String(a).slice(2));
    }
    if (String(b).match(/^0x.+/u)) {
      b1 = Number(String(b).slice(2));
    }
    return a1 + b1;
  }),
  conversionUtil: jest.fn((val) => parseInt(val, 16)),
  conversionGTE: jest.fn((obj1, obj2) => obj1.value >= obj2.value),
  multiplyCurrencies: jest.fn((a, b) => `${a}x${b}`),
  conversionGreaterThan: (obj1, obj2) => obj1.value > obj2.value,
  conversionLessThan: (obj1, obj2) => obj1.value < obj2.value,
}));

jest.mock('../../helpers/utils/token-util', () => ({
  calcTokenAmount: (a, d) => `calc:${a}${d}`,
}));

jest.mock('ethereumjs-abi', () => ({
  rawEncode: jest.fn().mockReturnValue(16, 1100),
}));

describe('send utils', () => {
  describe('calcGasTotal()', () => {
    it('should call multiplyCurrencies with the correct params and return the multiplyCurrencies return', () => {
      const result = calcGasTotal(12, 15);
      expect(result).toStrictEqual('12x15');
      expect(multiplyCurrencies).toHaveBeenCalledWith(12, 15, {
        multiplicandBase: 16,
        multiplierBase: 16,
        toNumericBase: 'hex',
      });
    });
  });

  describe('doesAmountErrorRequireUpdate()', () => {
    const config = {
      'should return true if balances are different': {
        balance: 0,
        prevBalance: 1,
        expectedResult: true,
      },
      'should return true if gasTotals are different': {
        gasTotal: 0,
        prevGasTotal: 1,
        expectedResult: true,
      },
      'should return true if token balances are different': {
        tokenBalance: 0,
        prevTokenBalance: 1,
        sendToken: { address: '0x0' },
        expectedResult: true,
      },
      'should return false if they are all the same': {
        balance: 1,
        prevBalance: 1,
        gasTotal: 1,
        prevGasTotal: 1,
        tokenBalance: 1,
        prevTokenBalance: 1,
        sendToken: { address: '0x0' },
        expectedResult: false,
      },
    };
    Object.entries(config).forEach(([description, obj]) => {
      it(`${description}`, () => {
        expect(doesAmountErrorRequireUpdate(obj)).toStrictEqual(
          obj.expectedResult,
        );
      });
    });
  });

  describe('generateTokenTransferData()', () => {
    it('should return undefined if not passed a send token', () => {
      expect(
        generateTokenTransferData({
          toAddress: 'mockAddress',
          amount: '0xa',
          sendToken: undefined,
        }),
      ).toBeUndefined();
    });

    it('should call abi.rawEncode with the correct params', () => {
      generateTokenTransferData({
        toAddress: 'mockAddress',
        amount: 'ab',
        sendToken: { address: '0x0' },
      });
      expect(rawEncode.mock.calls[0].toString()).toStrictEqual(
        [
          ['address', 'uint256'],
          ['mockAddress', '0xab'],
        ].toString(),
      );
    });

    it('should return encoded token transfer data', () => {
      expect(
        generateTokenTransferData({
          toAddress: 'mockAddress',
          amount: '0xa',
          sendToken: { address: '0x0' },
        }),
      ).toStrictEqual('0xa9059cbb');
    });
  });

  describe('getAmountErrorObject()', () => {
    const config = {
      'should return insufficientFunds error if isBalanceSufficient returns false': {
        amount: 15,
        balance: 1,
        conversionRate: 3,
        gasTotal: 17,
        primaryCurrency: 'ABC',
        expectedResult: { amount: INSUFFICIENT_FUNDS_ERROR },
      },
      'should not return insufficientFunds error if sendToken is truthy': {
        amount: '0x0',
        balance: 1,
        conversionRate: 3,
        gasTotal: 17,
        primaryCurrency: 'ABC',
        sendToken: { address: '0x0', symbol: 'DEF', decimals: 0 },
        decimals: 0,
        tokenBalance: 'sometokenbalance',
        expectedResult: { amount: null },
      },
      'should return insufficientTokens error if token is selected and isTokenBalanceSufficient returns false': {
        amount: '0x10',
        balance: 100,
        conversionRate: 3,
        decimals: 10,
        gasTotal: 17,
        primaryCurrency: 'ABC',
        sendToken: { address: '0x0' },
        tokenBalance: 123,
        expectedResult: { amount: INSUFFICIENT_TOKENS_ERROR },
      },
    };
    Object.entries(config).forEach(([description, obj]) => {
      it(`${description}`, () => {
        expect(getAmountErrorObject(obj)).toStrictEqual(obj.expectedResult);
      });
    });
  });

  describe('getGasFeeErrorObject()', () => {
    const config = {
      'should return insufficientFunds error if isBalanceSufficient returns false': {
        balance: 16,
        conversionRate: 3,
        gasTotal: 17,
        primaryCurrency: 'ABC',
        expectedResult: { gasFee: INSUFFICIENT_FUNDS_ERROR },
      },
      'should return null error if isBalanceSufficient returns true': {
        balance: 16,
        conversionRate: 3,
        gasTotal: 15,
        primaryCurrency: 'ABC',
        expectedResult: { gasFee: null },
      },
    };
    Object.entries(config).forEach(([description, obj]) => {
      it(`${description}`, () => {
        expect(getGasFeeErrorObject(obj)).toStrictEqual(obj.expectedResult);
      });
    });
  });

  describe('calcTokenBalance()', () => {
    it('should return the calculated token balance', () => {
      expect(
        calcTokenBalance({
          sendToken: {
            address: '0x0',
            decimals: 11,
          },
          usersToken: {
            balance: 20,
          },
        }),
      ).toStrictEqual('calc:2011');
    });
  });

  describe('isBalanceSufficient()', () => {
    it('should correctly call addCurrencies and return the result of calling conversionGTE', () => {
      const result = isBalanceSufficient({
        amount: 15,
        balance: 100,
        conversionRate: 3,
        gasTotal: 17,
        primaryCurrency: 'ABC',
      });
      expect(addCurrencies).toHaveBeenCalledWith(15, 17, {
        aBase: 16,
        bBase: 16,
        toNumericBase: 'hex',
      });
      expect(conversionGTE).toHaveBeenCalledWith(
        {
          value: 100,
          fromNumericBase: 'hex',
          fromCurrency: 'ABC',
          conversionRate: 3,
        },
        {
          value: 32,
          fromNumericBase: 'hex',
          conversionRate: 3,
          fromCurrency: 'ABC',
        },
      );

      expect(result).toStrictEqual(true);
    });
  });

  describe('isTokenBalanceSufficient()', () => {
    it('should correctly call conversionUtil and return the result of calling conversionGTE', () => {
      const result = isTokenBalanceSufficient({
        amount: '0x10',
        tokenBalance: 123,
        decimals: 10,
      });

      expect(conversionUtil).toHaveBeenCalledWith('0x10', {
        fromNumericBase: 'hex',
      });

      expect(conversionGTE).toHaveBeenCalledWith(
        {
          value: 123,
          fromNumericBase: 'hex',
        },
        {
          value: 'calc:1610',
        },
      );

      expect(result).toStrictEqual(false);
    });
  });

  describe('getToAddressForGasUpdate()', () => {
    it('should return empty string if all params are undefined or null', () => {
      expect(getToAddressForGasUpdate(undefined, null)).toStrictEqual('');
    });

    it('should return the first string that is not defined or null in lower case', () => {
      expect(getToAddressForGasUpdate('A', null)).toStrictEqual('a');
      expect(getToAddressForGasUpdate(undefined, 'B')).toStrictEqual('b');
    });
  });

  describe('removeLeadingZeroes()', () => {
    it('should remove leading zeroes from int when user types', () => {
      expect(removeLeadingZeroes('0')).toStrictEqual('0');
      expect(removeLeadingZeroes('1')).toStrictEqual('1');
      expect(removeLeadingZeroes('00')).toStrictEqual('0');
      expect(removeLeadingZeroes('01')).toStrictEqual('1');
    });

    it('should remove leading zeroes from int when user copy/paste', () => {
      expect(removeLeadingZeroes('001')).toStrictEqual('1');
    });

    it('should remove leading zeroes from float when user types', () => {
      expect(removeLeadingZeroes('0.')).toStrictEqual('0.');
      expect(removeLeadingZeroes('0.0')).toStrictEqual('0.0');
      expect(removeLeadingZeroes('0.00')).toStrictEqual('0.00');
      expect(removeLeadingZeroes('0.001')).toStrictEqual('0.001');
      expect(removeLeadingZeroes('0.10')).toStrictEqual('0.10');
    });

    it('should remove leading zeroes from float when user copy/paste', () => {
      expect(removeLeadingZeroes('00.1')).toStrictEqual('0.1');
    });
  });
});
