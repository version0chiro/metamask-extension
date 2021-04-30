import sinon from 'sinon';

import {
  updateSendErrors,
  resetSendState,
  updateSendTokenBalance,
  updateGasData,
} from '../../ducks/send';

let mapDispatchToProps;

jest.mock('react-redux', () => ({
  connect: (_, md) => {
    mapDispatchToProps = md;
    return () => ({});
  },
}));

jest.mock('react-router-dom', () => ({
  withRouter: () => undefined,
}));

jest.mock('redux', () => ({
  compose: (_, arg2) => () => arg2(),
}));

jest.mock('../../ducks/send', () => ({
  updateSendErrors: jest.fn(),
  resetSendState: jest.fn(),
  updateSendTokenBalance: jest.fn(),
  updateGasData: jest.fn(),
}));

jest.mock('./send.utils.js', () => ({
  calcGasTotal: (gasLimit, gasPrice) => gasLimit + gasPrice,
}));

require('./send.container.js');

describe('send container', () => {
  describe('mapDispatchToProps()', () => {
    let dispatchSpy;
    let mapDispatchToPropsObject;

    beforeEach(() => {
      dispatchSpy = sinon.spy();
      mapDispatchToPropsObject = mapDispatchToProps(dispatchSpy);
    });

    describe('updateAndSetGasLimit()', () => {
      const mockProps = {
        blockGasLimit: 'mockBlockGasLimit',
        editingTransactionId: '0x2',
        gasLimit: '0x3',
        gasPrice: '0x4',
        selectedAddress: '0x4',
        sendToken: { address: '0x1' },
        to: 'mockTo',
        value: 'mockValue',
        data: undefined,
      };

      it('should dispatch an updateGasData action when editingTransactionId is falsy', () => {
        const {
          gasPrice,
          selectedAddress,
          sendToken,
          blockGasLimit,
          to,
          value,
          data,
        } = mockProps;
        mapDispatchToPropsObject.updateAndSetGasLimit({
          ...mockProps,
          editingTransactionId: false,
        });
        expect(dispatchSpy.calledOnce).toStrictEqual(true);
        expect(updateGasData).toHaveBeenCalledWith({
          gasPrice,
          selectedAddress,
          sendToken,
          blockGasLimit,
          to,
          value,
          data,
        });
      });
    });

    describe('updateSendTokenBalance()', () => {
      const mockProps = {
        address: '0x10',
        tokenContract: '0x00a',
        sendToken: { address: '0x1' },
      };

      it('should dispatch an action', () => {
        mapDispatchToPropsObject.updateSendTokenBalance({ ...mockProps });
        expect(dispatchSpy.calledOnce).toStrictEqual(true);
        expect(updateSendTokenBalance).toHaveBeenCalledWith(mockProps);
      });
    });

    describe('updateSendErrors()', () => {
      it('should dispatch an action', () => {
        mapDispatchToPropsObject.updateSendErrors('mockError');
        expect(dispatchSpy.calledOnce).toStrictEqual(true);
        expect(updateSendErrors).toHaveBeenCalledWith('mockError');
      });
    });

    describe('resetSendState()', () => {
      it('should dispatch an action', () => {
        mapDispatchToPropsObject.resetSendState();
        expect(dispatchSpy.calledOnce).toStrictEqual(true);
        expect(resetSendState).toHaveBeenCalled();
      });
    });
  });
});
