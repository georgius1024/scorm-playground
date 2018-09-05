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
    console.log(wrapper.html())
    expect(wrapper.html()).toContain('OLOLOLOLOLO!')
    expect(WRAF).toBe(0)
  })
  it('should render child objects', () => {
    const wrapper = mount(App)
    // console.log(wrapper.html())
    expect(wrapper.html()).toContain('OLOLOLOLOLO!')
    expect(WRAF).toBe(2)
  })
  it('should click buttons', () => {
    const wrapper = mount(App)
    wrapper.trigger('click', {
      button: 0
    })
    wrapper.trigger('click', {
      button: 1
    })
    wrapper.trigger('click', {
      button: 2
    })
    wrapper.trigger('click', {
      button: 3
    })
    //console.log(App)
    
    App.methods.raiseMessage()
    App.methods.raiseError()
    App.methods.startSpinner()
    App.methods.stopSpinner()
    App.methods.startSpinner()
    App.methods.timedOut()
    
    // console.log(wrapper.html())
    expect(wrapper.html()).toContain('OLOLOLOLOLO!')
  })
})
