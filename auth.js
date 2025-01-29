// Create Gun instance with lower default options to prevent stack overflow
const gunOpts = {
  peers: ['https://gun-manhattan.herokuapp.com/gun'],
  localStorage: false,
  radisk: false,
  axe: false
};

const db = Gun(gunOpts);
const user = db.user().recall({sessionStorage: true});

document.addEventListener('DOMContentLoaded', () => {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const authContainer = document.getElementById('auth-container');
  const mainApp = document.getElementById('main-app');

  // Check if user is already logged in
  let authChecked = false;
  user.get('alias').once(username => {
    if(!authChecked && username){
      authChecked = true;
      showMainApp();
    }
  });

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      if (btn.dataset.tab === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
      } else {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
      }
    });
  });

  // Sign Up with debouncing
  let isSigningUp = false;
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSigningUp) return;
    isSigningUp = true;

    const username = signupForm.elements[0].value.trim();
    const password = signupForm.elements[1].value;

    if (!username || !password) {
      alert('Please fill in all fields');
      isSigningUp = false;
      return;
    }

    user.create(username, password, (ack) => {
      if (ack.err) {
        alert(ack.err);
        isSigningUp = false;
        return;
      }
      user.auth(username, password, (authAck) => {
        isSigningUp = false;
        if (authAck.err) {
          alert(authAck.err);
          return;
        }
        showMainApp();
      });
    });
  });

  // Login with debouncing
  let isLoggingIn = false;
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (isLoggingIn) return;
    isLoggingIn = true;

    const username = loginForm.elements[0].value.trim();
    const password = loginForm.elements[1].value;

    if (!username || !password) {
      alert('Please fill in all fields');
      isLoggingIn = false;
      return;
    }

    user.auth(username, password, (ack) => {
      isLoggingIn = false;
      if (ack.err) {
        alert(ack.err);
        return;
      }
      showMainApp();
    });
  });

  function showMainApp() {
    authContainer.classList.add('hidden');
    mainApp.classList.remove('hidden');
  }
});
