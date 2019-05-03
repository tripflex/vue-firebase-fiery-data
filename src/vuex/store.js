import Vue from 'vue'
import Vuex from 'vuex'
import router from '../router'
import firebase from '../config/firebase'
import dbs from '@/config/firestore'
import FieryVuex, { fieryBindings, fieryActions, fieryMutations, fieryMapMutations, fieryState } from 'fiery-vuex'

Vue.use(FieryVuex)
Vue.use(Vuex)

const state = {
  firstLoad: true,
  routing: false,
  currentUser: {},
  userProfile: {},
  currentTodo: null,
  todos: [],
  snackbar: {
    show: false,
    text: ''
  }
}

const getters = { }

const mutations = {
  SET_CURRENT_USER (state, payload) {
    state.currentUser = payload || {}
  },
  SET_USER_PROFILE(state, payload) {
    state.userProfile = payload || {}
  },
  SET_FIRST_LOAD (state) {
    state.firstLoad = false
  },
  SET_ROUTING (state, payload) {
    state.routing = payload
  },
  SHOW_SNACKBAR (state, payload) {
    state.snackbar.show = true
    state.snackbar.text = payload
  },
  HIDE_SNACKBAR (state) {
    state.snackbar.show = false
  },
  SET_TODOS( state, getTodos ){
    state.todos = getTodos()
    console.log('TODOS UPDATE!', Object.assign({}, state.todos));
  },
  ...fieryMapMutations({
    // mutation: stateVar
    'setTodo': 'currentTodo'
  })
}

const actions = {
  ...fieryBindings({
    // store.dispatch( 'setTodo', todoId )
    setTodo(context, todoId, $fiery) {
      return $fiery(dbs.todos.doc(todoId), {}, 'setTodo') // must list mutation here
    },
    // store.dispatch( 'loadTodos' )
    loadTodos(context, payload, $fiery) {
      return $fiery(dbs.todos, {}, 'SET_TODOS')
    },
    // store.dispatch( 'searchTodos', {done: true, limit: 10} )
    searchTodos(context, { done, limit }, $fiery) {
      const options = {
        query: q => q.where('done', '==', done),
        limit: limit
      }
      return $fiery(dbs.todos, options, 'setTodos')
    }
  }),
  FIRST_LOAD ({ commit }) {
    commit('SET_FIRST_LOAD')
  },
  ROUTE_PENDING ({ commit }) {
    commit('SET_ROUTING', true)
  },
  ROUTE_COMPLETE ({ commit }) {
    commit('SET_ROUTING', false)
  },
  FETCH_AUTH ({ state, dispatch, commit }) {
    return new Promise(resolve => {
      if (state.firstLoad) {
        firebase.auth().onAuthStateChanged(user => {
          commit('SET_CURRENT_USER', user)
          dispatch('FETCH_USER_PROFILE', user)

          if (state.routing) {
            resolve(user)
          } else if (!state.routing && !user) {
            router.replace({
              name: 'Login',
              query: {
                redirect: window.location.hash.substr(1)
              }
            })
          }
        })

        dispatch('FIRST_LOAD')
      } else {
        resolve(firebase.auth().currentUser)
      }
    })
  },
  FETCH_USER_PROFILE( { state, dispatch, commit }, user ){
    let userId = state.currentUser && state.currentUser.uid ? state.currentUser.uid : false
    // If user object passed, use that uid to fetch profile information for
    // This is passed above in FETCH_AUTH when auth state changes
    if (user && user.uid) {
      console.log('FETCH_AUTH called FETCH_USER_PROFILE, using that user object to fetch profile with', user )
      userId = user.uid;
    }

    if( ! userId ){
      commit('SET_USER_PROFILE', null )
      return
    }

    dbs.users.doc(userId).get().then( res => {
      commit('SET_USER_PROFILE', res.data() )
    }).catch( err => {
      console.log( err )
    })

  },
}

export default new Vuex.Store({ state, getters, mutations, actions })
