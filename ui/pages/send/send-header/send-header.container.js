import { connect } from 'react-redux';
import { getTitleKey, resetSendState } from '../../../ducks/send';
import { getMostRecentOverviewPage } from '../../../ducks/history/history';
import SendHeader from './send-header.component';

export default connect(mapStateToProps, mapDispatchToProps)(SendHeader);

function mapStateToProps(state) {
  return {
    mostRecentOverviewPage: getMostRecentOverviewPage(state),
    titleKey: getTitleKey(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    resetSendState: () => dispatch(resetSendState()),
  };
}
