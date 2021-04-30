import sinon from 'sinon';

import {
  updateSendErrors,
  updateSendAmount,
  setMaxModeTo,
} from '../../../../ducks/send';

let mapDispatchToProps;

jest.mock('react-redux', () => ({
  connect: (_, md) => {
    mapDispatchToProps = md;
    return () => ({});
  },
}));

jest.mock('../../../../ducks/send', () => ({
  sendAmountIsInError: (s) => `mockInError:${s}`,
  setMaxModeTo: jest.fn(),
  updateSendAmount: jest.fn(),
  updateSendErrors: jest.fn(),
}));

jest.mock('../../send.utils', () => ({
  getAmountErrorObject: (mockDataObject) => ({
    ...mockDataObject,
    mockChange: true,
  }),
  getGasFeeErrorObject: (mockDataObject) => ({
    ...mockDataObject,
    mockGasFeeErrorChange: true,
  }),
}));

require('./send-amount-row.container.js');

describe('send-amount-row container', () => {
  describe('mapDispatchToProps()', () => {
    let dispatchSpy;
    let mapDispatchToPropsObject;

    beforeEach(() => {
      dispatchSpy = sinon.spy();
      mapDispatchToPropsObject = mapDispatchToProps(dispatchSpy);
    });

    describe('setMaxModeTo()', () => {
      it('should dispatch an action', () => {
        mapDispatchToPropsObject.setMaxModeTo('mockBool');
        expect(dispatchSpy.calledOnce).toStrictEqual(true);
        expect(setMaxModeTo).toHaveBeenCalled();
        expect(setMaxModeTo).toHaveBeenCalledWith('mockBool');
      });
    });

    describe('updateSendAmount()', () => {
      it('should dispatch an action', () => {
        mapDispatchToPropsObject.updateSendAmount('mockAmount');
        expect(dispatchSpy.calledOnce).toStrictEqual(true);
        expect(updateSendAmount).toHaveBeenCalled();
        expect(updateSendAmount).toHaveBeenCalledWith('mockAmount');
      });
    });

    describe('updateGasFeeError()', () => {
      it('should dispatch an action', () => {
        mapDispatchToPropsObject.updateGasFeeError({ some: 'data' });
        expect(dispatchSpy.calledOnce).toStrictEqual(true);
        expect(updateSendErrors).toHaveBeenCalled();
        expect(updateSendErrors).toHaveBeenCalledWith({
          some: 'data',
          mockGasFeeErrorChange: true,
        });
      });
    });

    describe('updateSendAmountError()', () => {
      it('should dispatch an action', () => {
        mapDispatchToPropsObject.updateSendAmountError({ some: 'data' });
        expect(dispatchSpy.calledOnce).toStrictEqual(true);
        expect(updateSendErrors).toHaveBeenCalled();
        expect(updateSendErrors).toHaveBeenCalledWith({
          some: 'data',
          mockChange: true,
        });
      });
    });
  });
});
