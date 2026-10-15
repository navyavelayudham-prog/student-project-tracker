
let projects = [];
let editingId = null;
let loading = false;
let saving = false;

const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const projectList = document.querySelector('#project-list');
const emptyState = document.querySelector('#empty-state');
const saveButton = document.querySelector('#save-button');
const cancelButton = document.querySelector('#cancel-button');
const formTitle = document.querySelector('#form-title');
const message = document.querySelector('#message');

function showMessage(text) {
  message.textContent = text;
}

function updateButtonState() {
  saveButton.disabled = loading || saving;
  cancelButton.disabled = loading || saving;
  projectList.querySelectorAll('button').forEach(button => {
    button.disabled = loading || saving;
  });
}

async function requestApi(url, options = {}) {
  let response;

  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(
      'Cannot connect to the server. Check that your server is running and try again.'
    );
  }

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status}).`;

    try {
      const data = await response.json();
      if (data.error) errorMessage = data.error;
    } catch {
      // Keep the default error message if the response is not JSON.
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) return null;

  try {
    return await response.json();
  } catch {
    throw new Error('The server returned an invalid response.');
  }
}

function render() {
  projectList.innerHTML = '';

  if (emptyState) {
    emptyState.style.display =
      !loading && projects.length === 0 ? 'block' : 'none';
  }

  projects.forEach(project => {
    const li = document.createElement('li');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = project.name;

    const statusSpan = document.createElement('span');
    statusSpan.textContent = ` — Status: ${project.status}`;

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = 'Edit';
    editBtn.style.marginLeft = '0.5rem';
    editBtn.addEventListener('click', () => startEdit(project));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.style.marginLeft = '0.5rem';
    deleteBtn.addEventListener('click', () => confirmAndDelete(project));

    li.appendChild(nameSpan);
    li.appendChild(statusSpan);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);
    projectList.appendChild(li);
  });

  updateButtonState();
}

async function loadProjects(showLoadingMessage = true) {
  loading = true;

  if (showLoadingMessage) showMessage('Loading projects...');
  render();

  try {
    const data = await requestApi('/api/projects');

    if (!Array.isArray(data)) {
      throw new Error('The server returned an invalid project list.');
    }

    projects = data;

    if (editingId !== null &&
        !projects.some(project => project.id === editingId)) {
      resetFormMode();
    }

    render();

    if (projects.length === 0) {
      showMessage('No projects have been added yet.');
    } else {
      showMessage(`Loaded ${projects.length} project(s).`);
    }

    return true;
  } catch (error) {
    showMessage(`Could not load projects: ${error.message}`);
    return false;
  } finally {
    loading = false;
    render();
  }
}

function startEdit(project) {
  if (loading || saving) return;

  editingId = project.id;
  nameInput.value = project.name;
  statusInput.value = project.status;

  if (formTitle) formTitle.textContent = 'Edit Project';

  saveButton.textContent = 'Save changes';
  cancelButton.hidden = false;
  showMessage(`Editing "${project.name}".`);
  updateButtonState();
  nameInput.focus();
}

function resetFormMode() {
  editingId = null;
  form.reset();

  if (formTitle) formTitle.textContent = 'Add a Project';

  saveButton.textContent = 'Add';
  cancelButton.hidden = true;
  updateButtonState();
}

async function confirmAndDelete(project) {
  if (loading || saving) return;

  const confirmed = window.confirm(
    `Are you sure you want to delete "${project.name}"?`
  );

  if (!confirmed) return;

  saving = true;
  showMessage('Deleting project...');
  render();

  try {
    await requestApi(
      `/api/projects/${encodeURIComponent(project.id)}`,
      { method: 'DELETE' }
    );

    if (editingId === project.id) {
      resetFormMode();
    }

    await loadProjects(false);
    showMessage(`Deleted "${project.name}".`);
  } catch (error) {
    showMessage(`Could not delete project: ${error.message}`);
  } finally {
    saving = false;
    render();
  }
}

cancelButton.addEventListener('click', () => {
  if (loading || saving) return;

  resetFormMode();
  showMessage('Edit cancelled.');
});

form.addEventListener('submit', async event => {
  event.preventDefault();

  if (loading || saving) return;

  const name = nameInput.value.trim();
  const status = statusInput.value;

  if (!name) {
    showMessage('Please enter a project name.');
    nameInput.focus();
    return;
  }

  const wasEditing = editingId !== null;
  const idBeingEdited = editingId;

  saving = true;
  showMessage(wasEditing ? 'Saving changes...' : 'Adding project...');
  render();

  try {
    await requestApi(
      wasEditing
        ? `/api/projects/${encodeURIComponent(idBeingEdited)}`
        : '/api/projects',
      {
        method: wasEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, status })
      }
    );

    const loaded = await loadProjects(false);

    if (loaded) {
      resetFormMode();
      showMessage(wasEditing ? 'Changes saved successfully.' :
        'Project added successfully.');
    } else {
      showMessage(
        'The save succeeded, but the project list could not be refreshed. Try reloading.'
      );
    }
  } catch (error) {
    showMessage(`Could not save project: ${error.message}`);
  } finally {
    saving = false;
    render();
  }
});

// Load saved projects from the API when the page opens.
loadProjects();

