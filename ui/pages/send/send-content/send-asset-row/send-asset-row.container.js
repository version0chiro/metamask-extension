import { connect } from 'react-redux';
import {
  getMetaMaskAccounts,
  getNativeCurrencyImage,
  getAssetImages,
} from '../../../../selectors';
import { updateSendToken, getSendTokenAddress } from '../../../../ducks/send';
import { getNativeCurrency } from '../../../../ducks/metamask/metamask';
import SendAssetRow from './send-asset-row.component';

function mapStateToProps(state) {
  return {
    tokens: state.metamask.tokens,
    selectedAddress: state.metamask.selectedAddress,
    sendTokenAddress: getSendTokenAddress(state),
    accounts: getMetaMaskAccounts(state),
    nativeCurrency: getNativeCurrency(state),
    nativeCurrencyImage: getNativeCurrencyImage(state),
    assetImages: getAssetImages(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    setSendToken: (token) => dispatch(updateSendToken(token)),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(SendAssetRow);
