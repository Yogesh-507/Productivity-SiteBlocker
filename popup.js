document.addEventListener('DOMContentLoaded', function() {
  const loginSection = document.getElementById('loginSection');
  const controlSection = document.getElementById('controlSection');
  const blockedSitesList = document.getElementById('blockedSitesList');
  const currentSchedule = document.getElementById('currentSchedule');

  document.getElementById('unlock').addEventListener('click', unlock);
  document.getElementById('lock').addEventListener('click', lock);
  document.getElementById('addSite').addEventListener('click', addSite);
  document.getElementById('updateSchedule').addEventListener('click', updateSchedule);

  document.querySelector('.toggle-password').addEventListener('click', function() {
    const input = document.getElementById('password');
    if (input.type === 'password') {
      input.type = 'text';
      this.textContent = '👁️‍🗨️';
    } else {
      input.type = 'password';
      this.textContent = '👁️';
    }
  });

  function unlock() {
    let password = document.getElementById('password').value;
    chrome.runtime.sendMessage({action: "unlock", password: password}, function(response) {
      if (response.success) {
        loginSection.classList.add('hidden');
        controlSection.classList.remove('hidden');
        loadBlockedSites();
        loadSchedule();
      } else {
        alert('Incorrect password');
      }
    });
  }

  function lock() {
    chrome.runtime.sendMessage({action: "lock"}, function(response) {
      if (response.success) {
        controlSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
      }
    });
  }

  function addSite() {
    let newSite = document.getElementById('newSite').value;
    chrome.runtime.sendMessage({action: "getSites"}, function(response) {
      let sites = response.sites || [];
      if (!sites.includes(newSite)) {
        sites.push(newSite);
        chrome.runtime.sendMessage({action: "updateSites", sites: sites}, function(response) {
          if (response.success) {
            loadBlockedSites();
            document.getElementById('newSite').value = '';
          } else {
            alert('Failed to add site');
          }
        });
      } else {
        alert('Site already in the list');
      }
    });
  }

  function loadBlockedSites() {
    chrome.runtime.sendMessage({action: "getSites"}, function(response) {
      blockedSitesList.innerHTML = '';
      (response.sites || []).forEach(site => {
        let li = document.createElement('li');
        li.textContent = site;
        let removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'btn';
        removeButton.addEventListener('click', () => removeSite(site));
        li.appendChild(removeButton);
        blockedSitesList.appendChild(li);
      });
    });
  }

  function removeSite(site) {
    chrome.runtime.sendMessage({action: "getSites"}, function(response) {
      let sites = response.sites || [];
      const index = sites.indexOf(site);
      if (index > -1) {
        sites.splice(index, 1);
        chrome.runtime.sendMessage({action: "updateSites", sites: sites}, function(response) {
          if (response.success) {
            loadBlockedSites();
          } else {
            alert('Failed to remove site');
          }
        });
      }
    });
  }

  function updateSchedule() {
    let schedule = {};
    document.querySelectorAll('input[name="day"]:checked').forEach(checkbox => {
      let day = parseInt(checkbox.value);
      let startTime = document.getElementById('startTime').value;
      let endTime = document.getElementById('endTime').value;
      if (startTime && endTime) {
        schedule[day] = [{
          start: timeToMinutes(startTime),
          end: timeToMinutes(endTime)
        }];
      }
    });

    chrome.runtime.sendMessage({action: "updateSchedule", schedule: schedule}, function(response) {
      if (response.success) {
        loadSchedule();
      } else {
        alert('Failed to update schedule');
      }
    });
  }

  function loadSchedule() {
    chrome.runtime.sendMessage({action: "getSchedule"}, function(response) {
      let schedule = response.schedule || {};
      currentSchedule.innerHTML = '';
      let days = Object.keys(schedule).sort();
      if (days.length > 0) {
        let dayNames = days.map(day => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]);
        let timeRange = schedule[days[0]][0];
        let startTime = minutesToTime(timeRange.start);
        let endTime = minutesToTime(timeRange.end);
        currentSchedule.innerHTML = `<p>${dayNames.join(', ')} from ${startTime} to ${endTime}</p>`;
      }
    });
  }

  function timeToMinutes(time) {
    let [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  function minutesToTime(minutes) {
    let hours = Math.floor(minutes / 60);
    let mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  chrome.runtime.sendMessage({action: "checkFirstRun"}, function(response) {
    if (response.isFirstRun) {
      // Show password setup UI
      loginSection.innerHTML = `
        <h2>Set Up Password</h2>
        <div class="input-group">
          <input type="password" id="newPassword" placeholder="Enter new password">
          <button class="toggle-password" type="button" aria-label="Toggle password visibility">👁️</button>
        </div>
        <button id="setPassword" class="btn">Set Password</button>
      `;
      document.getElementById('setPassword').addEventListener('click', setPassword);
      document.querySelector('.toggle-password').addEventListener('click', function() {
        const input = document.getElementById('newPassword');
        if (input.type === 'password') {
          input.type = 'text';
          this.textContent = '👁️‍🗨️';
        } else {
          input.type = 'password';
          this.textContent = '👁️';
        }
      });
    }
  });

  function setPassword() {
    let newPassword = document.getElementById('newPassword').value;
    chrome.runtime.sendMessage({action: "setPassword", password: newPassword}, function(response) {
      if (response.success) {
        alert('Password set successfully');
        window.location.reload();
      } else {
        alert('Failed to set password');
      }
    });
  }

  loadBlockedSites();
  loadSchedule();
});
