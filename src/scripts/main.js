document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.form-section form');
  
  // Якщо форми немає (ми на main.html) - не виконувати код
  if (!form) {
    console.log('No form found, skipping form logic');
    return;
  }

  const nameInput = form.querySelector('input[type="text"]');
  const emailInput = form.querySelector('input[type="email"]');
  const passwordInput = form.querySelector('input[type="password"]');
  const submitButton = form.querySelector('button');
  const formTitle = document.querySelector('.form-section h2');
  const formSubtext = document.querySelector('.form-section p');

  let isSignUpMode = true;

  // Делегування подій для динамічного посилання
  formSubtext.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      e.preventDefault();
      toggleMode();
    }
  });

  function toggleMode() {
    if (isSignUpMode) {
      // Перехід до режиму Sign In
      nameInput.style.display = 'none';
      nameInput.removeAttribute('required');
      submitButton.textContent = 'Continue';
      formTitle.textContent = 'Welcome back!';
      formSubtext.innerHTML = 'Don\'t have an account? <a href="#">Sign up</a>';
      isSignUpMode = false;
      console.log('Switched to Sign In mode');
    } else {
      // Перехід до режиму Sign Up
      nameInput.style.display = 'block';
      nameInput.setAttribute('required', '');
      submitButton.textContent = 'Create Account';
      formTitle.textContent = 'Hello, friend!';
      formSubtext.innerHTML = 'Already have an account? <a href="#">Sign in</a>';
      isSignUpMode = true;
      console.log('Switched to Sign Up mode');
    }
  }

  // Обробка відправки форми
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    console.log('Form submitted:', { isSignUpMode, email });

    try {
      const url = isSignUpMode 
        ? 'http://127.0.0.1:3000/register' 
        : 'http://127.0.0.1:3000/login';
      
      const bodyData = isSignUpMode
        ? { username, email, password }
        : { email, password };

      console.log('Sending request to:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bodyData)
      });

      const result = await response.json();
      console.log('Server response:', result);

      alert(result.message);

      if (result.success) {
        // Persist username when server returns it (fallback for clients that don't send cookies)
        if (result.username) {
          try {
            localStorage.setItem('username', result.username);
            console.log('Cached username in localStorage:', result.username);
          } catch (err) {
            console.warn('Could not write username to localStorage:', err);
          }
        }
        console.log('Success! Redirecting to main.html');
        window.location.href = 'main.html';
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Помилка з\'єднання з сервером!');
    }
  });
});