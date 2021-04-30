import { connect } from 'react-redux';
import { compose } from 'redux';
import { withRouter } from 'react-router-dom';
import {
  setGasLimit,
  setGasPrice,
  updateSendAmount,
  updateSendErrors,
  updateSendTo,
  setSendFrom,
  setEditingTransactionId,
} from '../../ducks/send';
import { clearConfirmTransaction } from '../../ducks/confirm-transaction/confirm-transaction.duck';
import ConfirmSendEther from './confirm-send-ether.component';

const mapStateToProps = (state) => {
  const {
    confirmTransaction: { txData: { txParams } = {} },
  } = state;

  return {
    txParams,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    editTransaction: (txData) => {
      const { id, txParams } = txData;
      const { from, gas: gasLimit, gasPrice, to, value: amount } = txParams;

      dispatch(updateSendTo({ to }));
      dispatch(setGasLimit(gasLimit));
      dispatch(setGasPrice(gasPrice));
      dispatch(updateSendAmount(amount));
      dispatch(updateSendErrors({ to: null, amount: null }));
      dispatch(setSendFrom(from));
      dispatch(setEditingTransactionId(id?.toString()));
      dispatch(clearConfirmTransaction());
    },
  };
};

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
)(ConfirmSendEther);
