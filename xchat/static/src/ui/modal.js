let __modal = null;

function showModal (title, content, buttons=[], footerAlign='right') {
    const outer = document.querySelector('.modal-outer'),
          modal = document.querySelector('.modal');

    outer.style.visibility = 'visible';
    modal.style.transform = 'scale(1.0)';
    
    modal.innerHTML = `
    <div>
        <h1>${escapeHTML(title)}</h1>
        <span id="modal-error"></span>
        ${content ? `<p>${content}</p>` : ""}
        <div class="modal-footer" style="text-align: ${footerAlign}">
            ${buttons.map((x,i) => `<button class="modal-button" id="${i}">${x.label}</button>`).join('')}
        </div>
    </div>
    `;

    __modal = { title, content, buttons };
}

function hideModal () {
    const outer = document.querySelector('.modal-outer'),
          modal = document.querySelector('.modal');
    
    modal.style = '';
    outer.style.visibility = 'hidden';
    modal.innerHTML = ``;
    
    __modal = null;
}

window.addEventListener('load', () => {
    const outer = document.querySelector('.modal-outer'),
          modal = document.querySelector('.modal');
    
    outer.addEventListener('click', (ev) => {
        hideModal();
    });

    modal.addEventListener('click', async (ev) => {
        if (ev.target.classList.contains("modal-button")) {
            const res = await __modal.buttons[ev.target.id]?.action();

            if (res == true)
                return;

            else if (typeof res == 'string')
                document.getElementById('modal-error').innerHTML = res;
        }

        ev.stopPropagation();
    });

    document.addEventListener('keydown', (ev) => {
        if (ev.key == 'Escape' && __modal) hideModal();
    })
})