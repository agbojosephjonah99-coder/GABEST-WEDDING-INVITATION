document.getElementById('rsvpForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const phone = document.getElementById('phone').value.trim();
  const name = document.getElementById('name').value.trim();
  const resultDiv = document.getElementById('result');

  resultDiv.innerHTML = '<p>Submitting...</p>';
  resultDiv.className = 'result';

  try {
    const response = await fetch('/api/rsvp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, name }),
    });

    const data = await response.json();

    if (response.status === 403) {
      resultDiv.innerHTML = '<p class="error">You are not invited</p>';
    } else if (response.status === 409) {
      resultDiv.innerHTML = `
        <div class="success">
          <p>Already RSVP'd</p>
          <div class="invitation">
            <p><strong>Name:</strong> ${data.name || name}</p>
            <p><strong>Code:</strong> ${data.code}</p>
            <p><strong>Seat Number:</strong> ${data.seatNumber}</p>
            <a href="${data.cardDataUrl}" class="download-btn" download="invitation.svg">Download Invitation</a>
          </div>
        </div>
      `;
    } else if (response.ok) {
      resultDiv.innerHTML = `
        <div class="success">
          <p>RSVP Successful!</p>
          <div class="invitation">
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Code:</strong> ${data.code}</p>
            <p><strong>Seat Number:</strong> ${data.seatNumber}</p>
            <a href="${data.cardDataUrl}" class="download-btn" download="invitation.svg">Download Invitation</a>
          </div>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `<p class="error">${data.error || 'An error occurred'}</p>`;
    }
  } catch (error) {
    resultDiv.innerHTML = '<p class="error">Network error. Please try again.</p>';
  }
});