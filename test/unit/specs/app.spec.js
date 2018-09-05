import Vue from 'vue'
import App from '@/App'
import {
  mount, 
  shallowMount
} from '@vue/test-utils'

Vue.component('router-view',
  {
    render: function (createElement) {
      return createElement(
        'div',
        this.$slots.default
      )
    }
  }
)


describe('App.vue', () => {
  let WRAF = 0
  window.requestAnimationFrame = function () { WRAF ++}
  it('should render correct contents', () => {
    const wrapper = shallowMount(App)
    expect(wrapper.html()).toContain('Switch drawer (click me)')
    expect(WRAF).toBe(0)
  })
  it('should render child objects', () => {
    const wrapper = mount(App)
    // console.log(wrapper.html())
    expect(wrapper.html()).toContain('Switch drawer (click me)')
    expect(WRAF).toBe(8)

  })
})
