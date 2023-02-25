let count = 0;

function waitFor(object, key, fn) {
  key in object
  ? fn(object[key])
  : setTimeout(() => waitFor(object, key, fn), 10)
}

let client;
let password;

exports.middleware = (store) => (next) => (action) => {
  if ('SESSION_PTY_DATA' === action.type) {
    const { data } = action;
    if (detectSSHLogin(data) && count == 0) {
      dispatchUserData(action.uid, '\f')(store.dispatch, store.getState);
      dispatchUserData(action.uid, 'neofetch\n')(store.dispatch, store.getState);
      count += 1;
    } else if (detectSSHPasswordRequest(data)) {
      dispatchUserData(action.uid, password + '\n')(store.dispatch, store.getState);
    }
  }
  next(action);
}

exports.onRendererWindow = (window) => {
  waitFor(window, 'rpc', (rpc) => {

    const conf = config.getConfig();
    client = conf['auto_ssh']['client'];
    password = conf['auto_ssh']['password'];
    
    rpc.on('session add', ({ uid }) =>
      rpc.emit('data', { uid,  data: "ssh " + client + "\n"})
    )
  });
}

function dispatchUserData(uid, data, escaped) {
  return (dispatch, getState) => {
    dispatch({
      type: 'SESSION_USER_DATA',
      data: data,
      effect() {
        const targetUid = uid || getState().sessions.activeUid;

        window.rpc.emit('data', {uid: targetUid, data, escaped})
      }
    })
  }
}

function detectSSHLogin(data) {
  return /Last login:?[^\s]/g.test(data);
}

function detectSSHPasswordRequest(data) {
  return data.includes(`${client}'s password:`);
}