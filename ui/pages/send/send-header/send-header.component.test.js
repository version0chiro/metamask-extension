import React from 'react';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import PageContainerHeader from '../../../components/ui/page-container/page-container-header';
import SendHeader from './send-header.component';

describe('SendHeader Component', () => {
  let wrapper;

  const propsMethodSpies = {
    resetSendState: sinon.spy(),
  };
  const historySpies = {
    push: sinon.spy(),
  };

  beforeAll(() => {
    sinon.spy(SendHeader.prototype, 'onClose');
  });

  beforeEach(() => {
    wrapper = shallow(
      <SendHeader
        resetSendState={propsMethodSpies.resetSendState}
        history={historySpies}
        mostRecentOverviewPage="mostRecentOverviewPage"
        titleKey="mockTitleKey"
      />,
      { context: { t: (str1, str2) => (str2 ? str1 + str2 : str1) } },
    );
  });

  afterEach(() => {
    propsMethodSpies.resetSendState.resetHistory();
    historySpies.push.resetHistory();
    SendHeader.prototype.onClose.resetHistory();
  });

  afterAll(() => {
    sinon.restore();
  });

  describe('onClose', () => {
    it('should call resetSendState', () => {
      expect(propsMethodSpies.resetSendState.callCount).toStrictEqual(0);
      wrapper.instance().onClose();
      expect(propsMethodSpies.resetSendState.callCount).toStrictEqual(1);
    });

    it('should call history.push', () => {
      expect(historySpies.push.callCount).toStrictEqual(0);
      wrapper.instance().onClose();
      expect(historySpies.push.callCount).toStrictEqual(1);
      expect(historySpies.push.getCall(0).args[0]).toStrictEqual(
        'mostRecentOverviewPage',
      );
    });
  });

  describe('render', () => {
    it('should render a PageContainerHeader component', () => {
      expect(wrapper.find(PageContainerHeader)).toHaveLength(1);
    });

    it('should pass the correct props to PageContainerHeader', () => {
      const { onClose, title } = wrapper.find(PageContainerHeader).props();
      expect(title).toStrictEqual('mockTitleKey');
      expect(SendHeader.prototype.onClose.callCount).toStrictEqual(0);
      onClose();
      expect(SendHeader.prototype.onClose.callCount).toStrictEqual(1);
    });
  });
});
