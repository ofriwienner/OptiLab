const FEEDBACK_GITHUB_TOKEN = ''; // Owner: set a fine-grained PAT with issues:write on this repo
const FEEDBACK_REPO = 'ofriwienner/OptiLab';

function openFeedback() {
    document.getElementById('feedback-modal').classList.remove('hidden');
    document.getElementById('feedback-message').focus();
}

function closeFeedback() {
    document.getElementById('feedback-modal').classList.add('hidden');
    document.getElementById('feedback-result').classList.add('hidden');
}

async function submitFeedback() {
    const contact = document.getElementById('feedback-contact').value.trim();
    const category = document.getElementById('feedback-category').value;
    const message = document.getElementById('feedback-message').value.trim();
    if (!message) {
        document.getElementById('feedback-message').classList.add('border-red-500');
        document.getElementById('feedback-message').focus();
        return;
    }
    document.getElementById('feedback-message').classList.remove('border-red-500');

    const title = `[${category}] ${message.slice(0, 60)}${message.length > 60 ? '...' : ''}`;
    let body = '';
    if (contact) body += `**From:** ${contact}\n\n`;
    body += `**Category:** ${category}\n\n**Feedback:**\n${message}`;

    const submitBtn = document.getElementById('feedback-submit-btn');
    const origText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    if (FEEDBACK_GITHUB_TOKEN) {
        try {
            const resp = await fetch(`https://api.github.com/repos/${FEEDBACK_REPO}/issues`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${FEEDBACK_GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                },
                body: JSON.stringify({ title, body, labels: ['feedback'] }),
            });
            if (resp.ok) {
                showFeedbackResult('Thank you! Your feedback was submitted.', false);
            } else {
                showFeedbackResult('Failed to send feedback. Please try again.', true);
            }
        } catch (err) {
            showFeedbackResult('Network error. Please check your connection.', true);
        }
    } else {
        showFeedbackResult('Feedback received! (System not yet configured.)', false);
    }

    submitBtn.disabled = false;
    submitBtn.textContent = origText;
}

function showFeedbackResult(msg, isError) {
    const resultDiv = document.getElementById('feedback-result');
    resultDiv.textContent = msg;
    resultDiv.className = isError
        ? 'text-[11px] text-red-400 text-center py-1'
        : 'text-[11px] text-green-400 text-center py-1';
    resultDiv.classList.remove('hidden');
    if (!isError) {
        document.getElementById('feedback-message').value = '';
        document.getElementById('feedback-contact').value = '';
        document.getElementById('feedback-category').value = 'Feature Request';
        setTimeout(closeFeedback, 1500);
    }
}
