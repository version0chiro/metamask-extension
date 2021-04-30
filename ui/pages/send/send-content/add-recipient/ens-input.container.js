import { connect } from 'react-redux';
import { CHAIN_ID_TO_NETWORK_ID_MAP } from '../../../../../shared/constants/network';
import { getAddressBookEntry, getCurrentChainId } from '../../../../selectors';
import { getSendTo, getSendToNickname } from '../../../../ducks/send';
import EnsInput from './ens-input.component';

export default connect((state) => {
  const selectedAddress = getSendTo(state);
  const chainId = getCurrentChainId(state);
  return {
    network: CHAIN_ID_TO_NETWORK_ID_MAP[chainId],
    selectedAddress,
    selectedName: getSendToNickname(state),
    contact: getAddressBookEntry(state, selectedAddress),
  };
})(EnsInput);
