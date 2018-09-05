import config from  '@/config'
import {
  shallowMount
} from '@vue/test-utils'

import Footer from '@/components/app/footer'

describe('footer.vue', () => {
  it('should render correct contents', () => {
    const wrapper = shallowMount(Footer)
    expect(wrapper.html()).toContain(config.APP_COPYRIGHT)
    expect(wrapper.html()).toContain(config.APP_NAME)
    expect(wrapper.html()).toContain(config.APP_VERSION)
  })

})
