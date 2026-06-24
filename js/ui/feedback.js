function openFeedback() {
    document.getElementById('feedback-modal').classList.remove('hidden');
    document.getElementById('feedback-message').focus();
}

function closeFeedback() {
    document.getElementById('feedback-modal').classList.add('hidden');
}

function submitFeedback() {
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
    body += `**Category:** ${category}\n\n`;
    body += `**Feedback:**\n${message}`;

    const url = `https://github.com/ofriwienner/OptiLab/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=feedback`;
    window.open(url, '_blank');

    closeFeedback();
    document.getElementById('feedback-message').value = '';
    document.getElementById('feedback-contact').value = '';
    document.getElementById('feedback-category').value = 'Feature Request';
}
