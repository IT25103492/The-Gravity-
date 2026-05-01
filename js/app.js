const app = {
    state: {
        user: null // null, { uid: '...', role: 'student' | 'admin', email: '...' }
    },
    
    init() {
        this.navigate('home');
        this.bindEvents();
        
        // Listen to Auth State
        auth.onAuthStateChanged(user => {
            if(user) {
                // Determine role based on email for simplicity
                const role = user.email.includes('admin') ? 'admin' : 'student';
                this.setUser({ uid: user.uid, email: user.email, role: role });
                
                // Navigate based on role if we just logged in or refreshed
                const currentView = document.querySelector('.view.active')?.id;
                if(currentView === 'view-login' || currentView === 'view-home') {
                    this.navigate(role === 'admin' ? 'admin' : 'student');
                } else {
                    // Just reload the active view data
                    this.navigate(currentView.replace('view-', ''));
                }
            } else {
                this.setUser(null);
                const currentView = document.querySelector('.view.active')?.id;
                if(['view-admin', 'view-student'].includes(currentView)) {
                    this.navigate('home');
                }
            }
        });
    },

    navigate(viewId) {
        // Prevent unauthorized access
        if(viewId === 'admin' && this.state.user?.role !== 'admin') {
            if(this.state.user) alert("Admin access required.");
            this.navigate('login');
            return;
        }

        if(viewId === 'student' && !this.state.user) {
            this.navigate('login');
            return;
        }

        // Hide all views
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        
        // Show target view
        const view = document.getElementById(`view-${viewId}`);
        if(view) {
            view.classList.remove('hidden');
            setTimeout(() => view.classList.add('active'), 10);
        }

        // Update nav links
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        const navLink = document.getElementById(`nav-${viewId}`);
        if(navLink) navLink.classList.add('active');

        // Load data if needed
        if(viewId === 'student' || viewId === 'admin') {
            admin.loadVideos(viewId);
        }
    },

    bindEvents() {
        // Login Submit
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.toLowerCase();
            const password = document.getElementById('password').value;
            const btn = e.target.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = 'Please wait...';
            btn.disabled = true;
            
            try {
                // Try to sign in
                await auth.signInWithEmailAndPassword(email, password);
            } catch (error) {
                if(error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
                    // Auto-register for testing purposes if user not found
                    try {
                        await auth.createUserWithEmailAndPassword(email, password);
                    } catch (regError) {
                        alert(regError.message);
                    }
                } else {
                    alert(error.message);
                }
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });

        // Logout
        document.getElementById('btn-logout').addEventListener('click', () => {
            auth.signOut();
            document.getElementById('login-form').reset();
            this.navigate('home');
        });
    },

    setUser(user) {
        this.state.user = user;
        this.updateNav();
    },

    updateNav() {
        const { user } = this.state;
        const btnLogin = document.getElementById('btn-login-nav');
        const btnLogout = document.getElementById('btn-logout');
        const navStudent = document.getElementById('nav-student');
        const navAdmin = document.getElementById('nav-admin');

        if(user) {
            btnLogin.classList.add('hidden');
            btnLogout.classList.remove('hidden');
            
            if(user.role === 'admin') {
                navAdmin.classList.remove('hidden');
                navStudent.classList.remove('hidden');
            } else {
                navAdmin.classList.add('hidden');
                navStudent.classList.remove('hidden');
            }
        } else {
            btnLogin.classList.remove('hidden');
            btnLogout.classList.add('hidden');
            navAdmin.classList.add('hidden');
            navStudent.classList.add('hidden');
        }
    },

    openModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    },

    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
        if(modalId === 'video-modal') {
            // Stop video playing by clearing iframe
            document.getElementById('player-container').innerHTML = '';
        }
    },

    playVideo(title, url, type = 'youtube') {
        document.getElementById('player-title').textContent = title;
        const container = document.getElementById('player-container');
        
        if(type === 'upload') {
            container.innerHTML = `<video src="${url}" controls autoplay controlsList="nodownload" style="position:absolute; top:0; left:0; width:100%; height:100%; border-radius:12px;"></video>`;
        } else {
            container.innerHTML = `<iframe src="${url}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        }
        
        this.openModal('video-modal');
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
