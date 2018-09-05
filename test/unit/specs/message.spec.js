
import Message from '@/components/app/message'
import {
  shallowMount
} from '@vue/test-utils'


const message = 'olololololo!'
describe('message.vue', () => {
  jest.useFakeTimers()

  it('Accept message property', () => {
    const wrapper = shallowMount(Message)
    const element = wrapper.find('v-snackbar-stub')
    wrapper.setProps({ message })
    expect(element.html()).toContain(message)
  })

  it('Accept level property', () => {
    const wrapper = shallowMount(Message)
    wrapper.setProps({ level: 'error' })
    const element = wrapper.find('v-snackbar-stub')
    expect(element.attributes().color).toBe('error')
    wrapper.setProps({ level: '' })
    expect(element.attributes().color).toBe('info')
  })

  it('Accept timeout property', () => {
    const wrapper = shallowMount(Message)
    wrapper.setProps({ timeout: 10000 })
    const element = wrapper.find('v-snackbar-stub')
    expect(element.attributes().timeout).toBe('10000')
  })
  /*
  it('should hide after timeout', async () => {
    const wrapper = shallowMount(Message)
    wrapper.setProps({ message: message, timeout: 10 })
    expect(wrapper.vm.$vnode.componentInstance.gotMessage).toBeTruthy()
    setTimeout(() => {
      expect(wrapper.vm.$vnode.componentInstance.gotMessage).toBeFalsy()
    }, 1000)
    jest.runAllTimers()
  })
   */


  it('should close after "closed()" call', () => {
    const wrapper = shallowMount(Message)
    wrapper.setProps({ message: message, timeout: 10 })
    expect(wrapper.vm.$vnode.componentInstance.gotMessage).toBeTruthy()
    wrapper.vm.$vnode.componentInstance.closed()
    expect(wrapper.vm.$vnode.componentInstance.gotMessage).toBeFalsy()
  })

  it('should close on button click', () => {
    const wrapper = shallowMount(Message)
    wrapper.setProps({ message: message })
    wrapper.find('v-btn-stub').trigger('click')
    expect(wrapper.vm.$vnode.componentInstance.gotMessage).toBeFalsy()
  })

})
