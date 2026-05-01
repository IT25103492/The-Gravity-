const admin = {
    // Local state for videos cache
    videos: [],

    openAddModal() {
        document.getElementById('admin-modal-title').textContent = 'Add New Video';
        document.getElementById('video-form').reset();
        document.getElementById('video-id').value = '';
        document.getElementById('upload-progress').textContent = '';
        this.toggleVideoSource(); // Reset UI based on default selection
        app.openModal('admin-modal');
    },

    openEditModal(id) {
        const video = this.videos.find(v => v.id === id);
        if(!video) return;

        document.getElementById('admin-modal-title').textContent = 'Edit Video';
        document.getElementById('video-id').value = video.id;
        document.getElementById('video-title').value = video.title;
        document.getElementById('video-desc').value = video.description;
        document.getElementById('video-source-type').value = video.type || 'youtube';
        document.getElementById('upload-progress').textContent = '';
        
        this.toggleVideoSource();

        if(video.type === 'upload') {
            document.getElementById('video-file').removeAttribute('required'); // Not required if editing and keeping old file
            document.getElementById('upload-progress').textContent = 'Leave empty to keep existing video file.';
        } else {
            document.getElementById('video-url').value = video.url;
        }
        
        app.openModal('admin-modal');
    },

    toggleVideoSource() {
        const type = document.getElementById('video-source-type').value;
        const urlGroup = document.getElementById('url-group');
        const uploadGroup = document.getElementById('upload-group');
        const urlInput = document.getElementById('video-url');
        const fileInput = document.getElementById('video-file');
        
        if(type === 'upload') {
            urlGroup.classList.add('hidden');
            uploadGroup.classList.remove('hidden');
            urlInput.removeAttribute('required');
            fileInput.setAttribute('required', 'true');
        } else {
            urlGroup.classList.remove('hidden');
            uploadGroup.classList.add('hidden');
            fileInput.removeAttribute('required');
            urlInput.setAttribute('required', 'true');
        }
    },

    async deleteVideo(id) {
        if(confirm('Are you sure you want to remove this video from the platform?')) {
            try {
                await db.collection('videos').doc(id).delete();
                // Real-time listener will automatically update the UI
            } catch (error) {
                console.error("Error deleting video:", error);
                alert("Could not delete video. Make sure you have the right permissions.");
            }
        }
    },

    async saveVideo(e) {
        e.preventDefault();
        const id = document.getElementById('video-id').value;
        const title = document.getElementById('video-title').value;
        const description = document.getElementById('video-desc').value;
        const sourceType = document.getElementById('video-source-type').value;
        
        let url = document.getElementById('video-url').value;
        let finalType = sourceType;

        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
            if(sourceType === 'upload') {
                const fileInput = document.getElementById('video-file');
                if(fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    const storageRef = storage.ref(`videos/${Date.now()}_${file.name}`);
                    const uploadTask = storageRef.put(file);
                    
                    const progressEl = document.getElementById('upload-progress');
                    
                    // Await the upload and track progress
                    await new Promise((resolve, reject) => {
                        uploadTask.on('state_changed', 
                            (snapshot) => {
                                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                progressEl.textContent = `Uploading: ${Math.round(progress)}%`;
                            }, 
                            (error) => reject(error), 
                            async () => {
                                url = await uploadTask.snapshot.ref.getDownloadURL();
                                resolve();
                            }
                        );
                    });
                    progressEl.textContent = 'Upload Complete!';
                } else if (!id) {
                    throw new Error("Please select a video file to upload.");
                } else {
                    // Updating an existing uploaded video without changing the file
                    url = this.videos.find(v => v.id === id).url;
                }
            } else {
                // Auto-convert standard youtube URL to embed URL
                if(url.includes('youtube.com/watch?v=')) {
                    const videoId = url.split('v=')[1].split('&')[0];
                    url = `https://www.youtube.com/embed/${videoId}`;
                } else if(url.includes('youtu.be/')) {
                    const videoId = url.split('youtu.be/')[1].split('?')[0];
                    url = `https://www.youtube.com/embed/${videoId}`;
                }
            }

            const videoData = {
                title,
                description,
                url,
                type: finalType,
                createdAt: id ? this.videos.find(v => v.id === id).createdAt : firebase.firestore.FieldValue.serverTimestamp()
            };

            if(id) {
                await db.collection('videos').doc(id).update(videoData);
            } else {
                await db.collection('videos').add(videoData);
            }
            app.closeModal('admin-modal');
        } catch (error) {
            console.error("Error saving video:", error);
            alert("Could not save video. " + error.message);
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    },

    loadVideos(viewType) {
        const containerId = viewType === 'admin' ? 'admin-video-list' : 'student-video-list';
        const container = document.getElementById(containerId);
        
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center;"><p style="color: var(--text-muted);">Loading videos...</p></div>';

        if(this.unsubscribe) {
            this.unsubscribe();
        }

        this.unsubscribe = db.collection('videos').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
            this.videos = [];
            container.innerHTML = '';

            if(snapshot.empty) {
                container.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: rgba(18,18,18,0.5); border-radius: 16px; border: 1px dashed var(--glass-border);">
                        <i class='bx bx-video-off' style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                        <p style="color: var(--text-muted);">No class videos available yet.</p>
                    </div>
                `;
                return;
            }

            snapshot.forEach((doc) => {
                const video = { id: doc.id, ...doc.data() };
                this.videos.push(video);

                const card = document.createElement('div');
                card.className = 'video-card glass';
                
                let actionsHtml = '';
                if(viewType === 'admin') {
                    actionsHtml = `
                        <div class="admin-actions">
                            <button class="btn btn-outline" style="flex:1;" onclick="admin.openEditModal('${video.id}')">
                                <i class='bx bx-edit-alt'></i> Edit
                            </button>
                            <button class="btn btn-danger" onclick="admin.deleteVideo('${video.id}')">
                                <i class='bx bx-trash'></i>
                            </button>
                        </div>
                    `;
                }

                let thumbnailStyle = '';
                if(video.type === 'youtube' || !video.type) {
                    const videoId = video.url.split('/embed/')[1]?.split('?')[0];
                    if(videoId) {
                        thumbnailStyle = `background-image: url('https://img.youtube.com/vi/${videoId}/hqdefault.jpg'); background-size: cover; background-position: center;`;
                    }
                }

                card.innerHTML = `
                    <div class="video-thumbnail" style="${thumbnailStyle}" onclick="app.playVideo('${video.title.replace(/'/g, "\\'")}', '${video.url}', '${video.type || 'youtube'}')">
                        <i class='bx bx-play-circle'></i>
                        <span style="position:absolute; bottom:10px; right:10px; background:rgba(0,0,0,0.8); padding:2px 8px; border-radius:4px; font-size:0.75rem; z-index:2; border: 1px solid rgba(255,255,255,0.1);">
                            ${(video.type === 'upload') ? 'Upload' : 'YouTube'}
                        </span>
                    </div>
                    <div class="video-info">
                        <h3>${video.title}</h3>
                        <p>${video.description}</p>
                        ${actionsHtml}
                    </div>
                `;
                container.appendChild(card);
            });
        }, (error) => {
            console.error("Error fetching videos:", error);
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; border: 1px dashed var(--danger);">
                    <p style="color: var(--danger);">Could not load videos. Please check Database rules.</p>
                </div>
            `;
        });
    }
};

// Bind form submit for admin modal
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('video-form').addEventListener('submit', (e) => admin.saveVideo(e));
});
