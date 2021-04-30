import abi from 'ethereumjs-abi';
import {
  addCurrencies,
  conversionUtil,
  conversionGTE,
  multiplyCurrencies,
  conversionGreaterThan,
  conversionLessThan,
} from '../../helpers/utils/conversion-util';

import { calcTokenAmount } from '../../helpers/utils/token-util';
import { addHexPrefix } from '../../../app/scripts/lib/util';

import {
  INSUFFICIENT_FUNDS_ERROR,
  INSUFFICIENT_TOKENS_ERROR,
  NEGATIVE_ETH_ERROR,
  TOKEN_TRANSFER_FUNCTION_SIGNATURE,
} from './send.constants';

export {
  addGasBuffer,
  calcGasTotal,
  calcTokenBalance,
  doesAmountErrorRequireUpdate,
  generateTokenTransferData,
  getAmountErrorObject,
  getGasFeeErrorObject,
  getToAddressForGasUpdate,
  isBalanceSufficient,
  isTokenBalanceSufficient,
  removeLeadingZeroes,
  ellipsify,
};

function calcGasTotal(gasLimit = '0', gasPrice = '0') {
  return multiplyCurrencies(gasLimit, gasPrice, {
    toNumericBase: 'hex',
    multiplicandBase: 16,
    multiplierBase: 16,
  });
}

function isBalanceSufficient({
  amount = '0x0',
  balance = '0x0',
  conversionRate = 1,
  gasTotal = '0x0',
  primaryCurrency,
}) {
  const totalAmount = addCurrencies(amount, gasTotal, {
    aBase: 16,
    bBase: 16,
    toNumericBase: 'hex',
  });

  const balanceIsSufficient = conversionGTE(
    {
      value: balance,
      fromNumericBase: 'hex',
      fromCurrency: primaryCurrency,
      conversionRate,
    },
    {
      value: totalAmount,
      fromNumericBase: 'hex',
      conversionRate,
      fromCurrency: primaryCurrency,
    },
  );

  return balanceIsSufficient;
}

function isTokenBalanceSufficient({ amount = '0x0', tokenBalance, decimals }) {
  const amountInDec = conversionUtil(amount, {
    fromNumericBase: 'hex',
  });

  const tokenBalanceIsSufficient = conversionGTE(
    {
      value: tokenBalance,
      fromNumericBase: 'hex',
    },
    {
      value: calcTokenAmount(amountInDec, decimals),
    },
  );

  return tokenBalanceIsSufficient;
}

function getAmountErrorObject({
  amount,
  balance,
  conversionRate,
  gasTotal,
  primaryCurrency,
  sendToken,
  tokenBalance,
}) {
  let insufficientFunds = false;
  if (gasTotal && conversionRate && !sendToken) {
    insufficientFunds = !isBalanceSufficient({
      amount,
      balance,
      conversionRate,
      gasTotal,
      primaryCurrency,
    });
  }

  let inSufficientTokens = false;
  if (sendToken && tokenBalance !== null) {
    const { decimals } = sendToken;
    inSufficientTokens = !isTokenBalanceSufficient({
      tokenBalance,
      amount,
      decimals,
    });
  }

  const amountLessThanZero = conversionGreaterThan(
    { value: 0, fromNumericBase: 'dec' },
    { value: amount, fromNumericBase: 'hex' },
  );

  let amountError = null;

  if (insufficientFunds) {
    amountError = INSUFFICIENT_FUNDS_ERROR;
  } else if (inSufficientTokens) {
    amountError = INSUFFICIENT_TOKENS_ERROR;
  } else if (amountLessThanZero) {
    amountError = NEGATIVE_ETH_ERROR;
  }

  return { amount: amountError };
}

function getGasFeeErrorObject({
  balance,
  conversionRate,
  gasTotal,
  primaryCurrency,
}) {
  let gasFeeError = null;

  if (gasTotal && conversionRate) {
    const insufficientFunds = !isBalanceSufficient({
      amount: '0x0',
      balance,
      conversionRate,
      gasTotal,
      primaryCurrency,
    });

    if (insufficientFunds) {
      gasFeeError = INSUFFICIENT_FUNDS_ERROR;
    }
  }

  return { gasFee: gasFeeError };
}

function calcTokenBalance({ sendToken, usersToken }) {
  const { decimals } = sendToken || {};
  return calcTokenAmount(usersToken.balance.toString(), decimals).toString(16);
}

function doesAmountErrorRequireUpdate({
  balance,
  gasTotal,
  prevBalance,
  prevGasTotal,
  prevTokenBalance,
  sendToken,
  tokenBalance,
}) {
  const balanceHasChanged = balance !== prevBalance;
  const gasTotalHasChange = gasTotal !== prevGasTotal;
  const tokenBalanceHasChanged = sendToken && tokenBalance !== prevTokenBalance;
  const amountErrorRequiresUpdate =
    balanceHasChanged || gasTotalHasChange || tokenBalanceHasChanged;

  return amountErrorRequiresUpdate;
}

function addGasBuffer(
  initialGasLimitHex,
  blockGasLimitHex,
  bufferMultiplier = 1.5,
) {
  const upperGasLimit = multiplyCurrencies(blockGasLimitHex, 0.9, {
    toNumericBase: 'hex',
    multiplicandBase: 16,
    multiplierBase: 10,
    numberOfDecimals: '0',
  });
  const bufferedGasLimit = multiplyCurrencies(
    initialGasLimitHex,
    bufferMultiplier,
    {
      toNumericBase: 'hex',
      multiplicandBase: 16,
      multiplierBase: 10,
      numberOfDecimals: '0',
    },
  );

  // if initialGasLimit is above blockGasLimit, dont modify it
  if (
    conversionGreaterThan(
      { value: initialGasLimitHex, fromNumericBase: 'hex' },
      { value: upperGasLimit, fromNumericBase: 'hex' },
    )
  ) {
    return initialGasLimitHex;
  }
  // if bufferedGasLimit is below blockGasLimit, use bufferedGasLimit
  if (
    conversionLessThan(
      { value: bufferedGasLimit, fromNumericBase: 'hex' },
      { value: upperGasLimit, fromNumericBase: 'hex' },
    )
  ) {
    return bufferedGasLimit;
  }
  // otherwise use blockGasLimit
  return upperGasLimit;
}

function generateTokenTransferData({
  toAddress = '0x0',
  amount = '0x0',
  sendToken,
}) {
  if (!sendToken) {
    return undefined;
  }
  return (
    TOKEN_TRANSFER_FUNCTION_SIGNATURE +
    Array.prototype.map
      .call(
        abi.rawEncode(
          ['address', 'uint256'],
          [toAddress, addHexPrefix(amount)],
        ),
        (x) => `00${x.toString(16)}`.slice(-2),
      )
      .join('')
  );
}

function getToAddressForGasUpdate(...addresses) {
  return [...addresses, '']
    .find((str) => str !== undefined && str !== null)
    .toLowerCase();
}

function removeLeadingZeroes(str) {
  return str.replace(/^0*(?=\d)/u, '');
}

function ellipsify(text, first = 6, last = 4) {
  return `${text.slice(0, first)}...${text.slice(-last)}`;
}
