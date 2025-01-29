document.addEventListener('DOMContentLoaded', () => {
  const db = Gun({
    peers: ['https://gun-manhattan.herokuapp.com/gun'],
    localStorage: false,
    radisk: false
  });
  
  const posts = db.get('toktik_posts');
  const follows = db.get('toktik_follows');
  const likes = db.get('toktik_likes');
  const comments = db.get('toktik_comments');
  
  const pages = document.querySelectorAll('.page');
  const navLinks = document.querySelectorAll('.bottom-nav a');
  const createPostBtn = document.getElementById('create-post');
  const createPostModal = document.getElementById('create-post-modal');
  const modalOverlay = document.getElementById('modal-overlay');
  const closeModalBtn = document.getElementById('cancel-post');
  const postForm = document.getElementById('post-form');
  const usernameForm = document.getElementById('username-form');
  const discoverFeed = document.querySelector('#discover .feed');
  const followingFeed = document.querySelector('#following .feed');

  // Clear existing posts from local storage
  localStorage.clear();

  // Navigation
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = link.getAttribute('href').substring(1);
      if (pageId) {
        showPage(pageId);
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  });

  function showPage(pageId) {
    pages.forEach(page => {
      if (page.id === pageId) {
        page.classList.add('active');
      } else {
        page.classList.remove('active');
      }
    });
  }

  // Create Post Modal
  createPostBtn?.addEventListener('click', () => {
    if (!user.is) {
      alert('Please login first');
      return;
    }
    createPostModal.style.display = 'block';
    modalOverlay.style.display = 'block';
  });

  closeModalBtn?.addEventListener('click', () => {
    createPostModal.style.display = 'none';
    modalOverlay.style.display = 'none';
    postForm.reset();
  });

  // Create Post
  postForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = postForm.elements.title.value.trim();
    const content = postForm.elements.content.value.trim();

    if (title && content && user.is) {
      const postId = Gun.text.random(12);
      const post = {
        title,
        content,
        username: user.is.alias,
        timestamp: Date.now(),
        id: postId,
        likes: 0,
        comments: 0,
        follows: 0
      };
      
      posts.get(postId).put(post);
      postForm.reset();
      createPostModal.style.display = 'none';
      modalOverlay.style.display = 'none';
      showPage('discover');
    }
  });

  // Update Username
  usernameForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newUsername = usernameForm.elements.username.value.trim();
    
    if (newUsername && user.is) {
      try {
        await user.get('alias').put(newUsername);
        alert('Username updated successfully!');
        usernameForm.reset();
      } catch (err) {
        alert('Failed to update username');
      }
    }
  });

  // Keep track of rendered posts to prevent duplicates
  const renderedPosts = new Set();
  let isLoadingPosts = false;

  // Load posts with pagination
  const loadPosts = () => {
    if (isLoadingPosts || !discoverFeed) return;
    isLoadingPosts = true;

    const emptyState = document.querySelector('#discover .empty-state');
    
    posts.map().once((data, id) => {
      if (data && !renderedPosts.has(id) && data.timestamp) {
        if (emptyState) {
          emptyState.style.display = 'none';
        }
        renderedPosts.add(id);
        addPostToFeed(data, id);
      }
    });

    isLoadingPosts = false;
  };

  // Initial load
  setTimeout(loadPosts, 100);

  function addPostToFeed(post, id) {
    if (!discoverFeed) return;
    
    const postElement = document.createElement('div');
    postElement.className = 'post-container';
    postElement.innerHTML = `
      <div class="user">
        <span class="username">@${post.username || 'anonymous'}</span>
      </div>
      <div class="post-content">${post.title ? `<h3>${post.title}</h3>${post.content}` : post.content}</div>
      <div class="video-actions">
        <button class="like" data-id="${id}">
          <i class="fas fa-heart"></i>
          <span>${post.likes || 0}</span>
        </button>
        <button class="comment" data-id="${id}">
          <i class="fas fa-comment"></i>
          <span>${post.comments || 0}</span>
        </button>
        <button class="follow" data-id="${id}">
          <i class="fas fa-user-plus"></i>
          <span>${post.follows || 0}</span>
        </button>
      </div>
    `;

    // Insert post in chronological order
    let inserted = false;
    Array.from(discoverFeed.children).some(child => {
      const childPost = child.__post;
      if (childPost && childPost.timestamp < post.timestamp) {
        discoverFeed.insertBefore(postElement, child);
        inserted = true;
        return true;
      }
      return false;
    });

    if (!inserted) {
      discoverFeed.appendChild(postElement);
    }

    postElement.__post = post;

    // Like functionality
    const likeBtn = postElement.querySelector('.like');
    likeBtn.addEventListener('click', () => {
      if(!user.is){
        alert('Please login first');
        return;
      }
      
      const userId = user.is.pub;
      const likeId = `${id}_${userId}`;
      
      likes.get(likeId).once((liked) => {
        if (!liked) {
          likes.get(likeId).put(true);
          posts.get(id).get('likes').once((currentLikes) => {
            posts.get(id).get('likes').put((currentLikes || 0) + 1);
          });
        }
      });
    });

    // Comment functionality
    const commentBtn = postElement.querySelector('.comment');
    commentBtn.addEventListener('click', () => {
      if(!user.is){
        alert('Please login first');
        return;
      }
      const comment = prompt('Enter your comment:');
      if (comment) {
        const commentId = Gun.text.random(12);
        comments.get(id).get(commentId).put({
          text: comment,
          username: user.is.alias,
          timestamp: Date.now()
        });
        posts.get(id).get('comments').once((currentComments) => {
          posts.get(id).get('comments').put((currentComments || 0) + 1);
        });
      }
    });

    // Follow functionality
    const followBtn = postElement.querySelector('.follow');
    followBtn.addEventListener('click', () => {
      if(!user.is){
        alert('Please login first');
        return;
      }
      
      const followerId = user.is.pub;
      const followId = `${post.username}_${followerId}`;
      
      follows.get(followId).once((followed) => {
        if (!followed) {
          follows.get(followId).put(true);
          posts.get(id).get('follows').once((currentFollows) => {
            posts.get(id).get('follows').put((currentFollows || 0) + 1);
          });
          alert(`You are now following @${post.username}`);
        } else {
          alert(`You are already following @${post.username}`);
        }
      });
    });
  }

  // Show home page by default
  showPage('home');

  // Cleanup
  window.addEventListener('beforeunload', () => {
    posts.off();
    likes.off();
    comments.off();
    follows.off();
    if (discoverFeed) {
      Array.from(discoverFeed.children).forEach(child => {
        if (child.__post) {
          delete child.__post;
        }
      });
    }
  });
});
