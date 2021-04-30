import { createSlice } from '@reduxjs/toolkit';
import abi from 'human-standard-token-abi';
import log from 'loglevel';
import { addHexPrefix } from 'ethereumjs-util';
import { multiplyCurrencies } from '../../helpers/utils/conversion-util';
import { GAS_LIMITS } from '../../../shared/constants/gas';
import { MIN_GAS_LIMIT_HEX } from '../../pages/send/send.constants';

import {
  addGasBuffer,
  calcGasTotal,
  calcTokenBalance,
  generateTokenTransferData,
} from '../../pages/send/send.utils';
import {
  getAveragePriceEstimateInHexWEI,
  getSelectedAccount,
  getTargetAccount,
} from '../../selectors';
import { estimateGas } from '../../store/actions';
import { setCustomGasLimit } from '../gas/gas.duck';

const name = 'send';

export const initialState = {
  gasButtonGroupShown: true,
  gasLimit: null,
  gasPrice: null,
  gasTotal: null,
  gasIsLoading: false,
  tokenBalance: '0x0',
  from: '',
  to: '',
  amount: '0',
  memo: '',
  errors: {},
  maxModeOn: false,
  editingTransactionId: null,
  toNickname: '',
  ensResolution: null,
  ensResolutionError: '',
};

const slice = createSlice({
  name,
  initialState,
  reducers: {
    updateSendErrors: (state, action) => {
      state.errors = { ...state.errors, ...action.payload };
    },
    showGasButtonGroup: (state) => {
      state.gasButtonGroupShown = true;
    },
    hideGasButtonGroup: (state) => {
      state.gasButtonGroupShown = false;
    },
    setGasLimit: (state, action) => {
      state.gasLimit = action.payload;
    },
    setGasPrice: (state, action) => {
      state.gasPrice = action.payload;
    },
    setSendTokenBalance: (state, action) => {
      state.tokenBalance = action.payload;
    },
    updateSendHexData: (state, action) => {
      state.data = action.payload;
    },
    updateSendTo: (state, action) => {
      state.to = action.payload.to;
      state.toNickname = action.payload.nickname;
    },
    updateSendAmount: (state, action) => {
      state.amount = action.payload;
    },
    setMaxModeTo: (state, action) => {
      state.maxModeOn = action.payload;
    },
    setEditingTransactionId: (state, action) => {
      state.editingTransactionId = action.payload;
    },
    setSendFrom: (state, action) => {
      state.from = action.payload;
    },
    updateSendToken: (state, action) => {
      state.token = action.payload;
      if (state.editingTransactionId && !state.token) {
        const unapprovedTx =
          state?.unapprovedTxs?.[state.editingTransactionId] || {};
        const txParams = unapprovedTx.txParams || {};
        state.tokenBalance = null;
        state.balance = '0';
        state.from = unapprovedTx.from ?? '';
        txParams.data = '';
      }
    },
    updateSendEnsResolution: (state, action) => {
      state.ensResolution = action.payload;
      state.ensResolutionError = '';
    },
    updateSendEnsResolutionError: (state, action) => {
      state.ensResolution = null;
      state.ensResolutionError = action.payload;
    },
    resetSendState: () => initialState,
    gasLoadingStarted: (state) => {
      state.gasIsLoading = true;
    },
    gasLoadingFinished: (state) => {
      state.gasIsLoading = false;
    },
  },
});

const { actions, reducer } = slice;

export default reducer;

const {
  updateSendErrors,
  showGasButtonGroup,
  hideGasButtonGroup,
  setGasLimit,
  setGasPrice,
  setSendTokenBalance,
  updateSendHexData,
  updateSendTo,
  updateSendAmount,
  setMaxModeTo,
  updateSendToken,
  updateSendEnsResolution,
  updateSendEnsResolutionError,
  resetSendState,
  gasLoadingStarted,
  gasLoadingFinished,
  setEditingTransactionId,
  setSendFrom,
} = actions;

export {
  updateSendErrors,
  showGasButtonGroup,
  hideGasButtonGroup,
  setGasLimit,
  setGasPrice,
  setSendTokenBalance,
  updateSendHexData,
  updateSendTo,
  updateSendAmount,
  setMaxModeTo,
  updateSendToken,
  updateSendEnsResolution,
  updateSendEnsResolutionError,
  setSendFrom,
  setEditingTransactionId,
  resetSendState,
};

export function updateSendTokenBalance({ sendToken, tokenContract, address }) {
  return (dispatch) => {
    const tokenBalancePromise = tokenContract
      ? tokenContract.balanceOf(address)
      : Promise.resolve();
    return tokenBalancePromise
      .then((usersToken) => {
        if (usersToken) {
          const newTokenBalance = calcTokenBalance({ sendToken, usersToken });
          dispatch(setSendTokenBalance(newTokenBalance));
        }
      })
      .catch((err) => {
        log.error(err);
        updateSendErrors({ tokenBalance: 'tokenBalanceError' });
      });
  };
}

async function estimateGasLimitForSend({
  selectedAddress,
  value,
  gasPrice,
  sendToken,
  to,
  data,
  blockGasLimit,
}) {
  // The parameters below will be sent to our background process to estimate
  // how much gas will be used for a transaction. That background process is
  // located in tx-gas-utils.js in the transaction controller folder.
  const paramsForGasEstimate = { from: selectedAddress, value, gasPrice };

  if (sendToken) {
    if (!to) {
      // if no to address is provided, we cannot generate the token transfer
      // hexData, which is the core component to our background process that
      // estimates gasLimit. We must use our best guess, which is represented
      // in the gas shared constants.
      return GAS_LIMITS.BASE_TOKEN_ESTIMATE;
    }
    paramsForGasEstimate.value = '0x0';
    // We have to generate the erc20 contract call to transfer tokens in
    // order to get a proper estimate for gasLimit.
    paramsForGasEstimate.data = generateTokenTransferData({
      toAddress: to,
      amount: value,
      sendToken,
    });
    paramsForGasEstimate.to = sendToken.address;
  } else {
    if (!data) {
      // eth.getCode will return the compiled smart contract code at the
      // address if this returns 0x, 0x0 or a nullish value then the address
      // is an externally owned account (NOT a contract account). For these
      // types of transactions the gasLimit will always be 21,000 or 0x5208
      const contractCode = Boolean(to) && (await global.eth.getCode(to));
      // Geth will return '0x', and ganache-core v2.2.1 will return '0x0'
      const contractCodeIsEmpty =
        !contractCode || contractCode === '0x' || contractCode === '0x0';
      if (contractCodeIsEmpty) {
        return GAS_LIMITS.SIMPLE;
      }
    }

    paramsForGasEstimate.data = data;

    if (to) {
      paramsForGasEstimate.to = to;
    }

    if (!value || value === '0') {
      // ??? Assuming that the value cannot be nullish or 0 to properly
      // estimate gasLimit?
      paramsForGasEstimate.value = '0xff';
    }
  }

  // If we do not yet have a gasLimit, we must call into our background
  // process to get an estimate for gasLimit based on known parameters.

  paramsForGasEstimate.gas = addHexPrefix(
    multiplyCurrencies(blockGasLimit ?? MIN_GAS_LIMIT_HEX, 0.95, {
      multiplicandBase: 16,
      multiplierBase: 10,
      roundDown: '0',
      toNumericBase: 'hex',
    }),
  );
  try {
    // call into the background process that will simulate transaction
    // execution on the node and return an estimate of gasLimit
    const estimatedGasLimit = await estimateGas(paramsForGasEstimate);
    const estimateWithBuffer = addGasBuffer(
      estimatedGasLimit.toString(16),
      blockGasLimit,
      1.5,
    );
    return addHexPrefix(estimateWithBuffer);
  } catch (error) {
    const simulationFailed =
      error.message.includes('Transaction execution error.') ||
      error.message.includes(
        'gas required exceeds allowance or always failing transaction',
      );
    if (simulationFailed) {
      const estimateWithBuffer = addGasBuffer(
        paramsForGasEstimate.gas,
        blockGasLimit,
        1.5,
      );
      return addHexPrefix(estimateWithBuffer);
    }
    log.error(error);
    throw error;
  }
}

export function updateGasData({
  gasPrice,
  blockGasLimit,
  selectedAddress,
  sendToken,
  to,
  value,
  data,
}) {
  return async (dispatch) => {
    // Indicate to the user that the app has started estimating gasLimit. Note
    // that this gas loading variable is specific to just gasLimit, not gas
    // price.
    await dispatch(gasLoadingStarted());

    try {
      const gasLimit = await estimateGasLimitForSend({
        gasPrice,
        blockGasLimit,
        selectedAddress,
        sendToken,
        to,
        value,
        data,
      });
      dispatch(setGasLimit(gasLimit));
      dispatch(setCustomGasLimit(gasLimit));
      dispatch(updateSendErrors({ gasLoadingError: null }));
    } catch (err) {
      dispatch(updateSendErrors({ gasLoadingError: 'gasLoadingError' }));
    }
    await dispatch(gasLoadingFinished());
  };
}

// Selectors
export function getGasLimit(state) {
  return state[name].gasLimit || '0';
}

export function getGasPrice(state) {
  return state[name].gasPrice || getAveragePriceEstimateInHexWEI(state);
}

export function getGasTotal(state) {
  return calcGasTotal(getGasLimit(state), getGasPrice(state));
}

export function getSendToken(state) {
  return state[name].token;
}

export function getSendTokenAddress(state) {
  return getSendToken(state)?.address;
}

export function getPrimaryCurrency(state) {
  const sendToken = getSendToken(state);
  return sendToken?.symbol;
}

export function getSendTokenContract(state) {
  const sendTokenAddress = getSendTokenAddress(state);
  return sendTokenAddress
    ? global.eth.contract(abi).at(sendTokenAddress)
    : null;
}

export function getSendAmount(state) {
  return state[name].amount;
}

export function getSendHexData(state) {
  return state[name].data;
}

export function getSendEditingTransactionId(state) {
  return state[name].editingTransactionId;
}

export function getSendFrom(state) {
  return state[name].from;
}

export function getSendFromBalance(state) {
  const fromAccount = getSendFromObject(state);
  return fromAccount.balance;
}

export function getSendFromObject(state) {
  const fromAddress = getSendFrom(state);
  return fromAddress
    ? getTargetAccount(state, fromAddress)
    : getSelectedAccount(state);
}

export function getSendMaxModeState(state) {
  return state[name].maxModeOn;
}

export function getSendTo(state) {
  return state[name].to;
}

export function getSendToNickname(state) {
  return state[name].toNickname;
}

export function getTokenBalance(state) {
  return state[name].tokenBalance;
}

export function getSendEnsResolution(state) {
  return state[name].ensResolution;
}

export function getSendEnsResolutionError(state) {
  return state[name].ensResolutionError;
}

export function getSendErrors(state) {
  return state[name].errors;
}

export function sendAmountIsInError(state) {
  return Boolean(state[name].errors.amount);
}

export function getGasLoadingError(state) {
  return state[name].errors.gasLoading;
}

export function gasFeeIsInError(state) {
  return Boolean(state[name].errors.gasFee);
}

export function getGasButtonGroupShown(state) {
  return state[name].gasButtonGroupShown;
}

export function getTitleKey(state) {
  const isEditing = Boolean(getSendEditingTransactionId(state));
  const isToken = Boolean(getSendToken(state));

  if (!getSendTo(state)) {
    return 'addRecipient';
  }

  if (isEditing) {
    return 'edit';
  } else if (isToken) {
    return 'sendTokens';
  }
  return 'send';
}

export function isSendFormInError(state) {
  return Object.values(getSendErrors(state)).some((n) => n);
}
