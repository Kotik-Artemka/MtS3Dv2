
(() => {
    const dialog = document.getElementById('account-dialog');
    const byId = id => document.getElementById(id);
    const cookieName = dialog.dataset.cookie + '_csrftoken';
    const form = byId('account-form');
    let mode = 'login', busy = false;
    let state = {authenticated:false, is_staff:false, role:'guest', username:''};
    function csrf() { return document.cookie.split('; ').find(c => c.startsWith(cookieName+'='))?.slice(cookieName.length+1) || ''; }
    function message(data) { return typeof data === 'string' ? data : Object.values(data || {}).flatMap(value => Array.isArray(value) ? value : [message(value)]).join(' '); }
    async function request(path, method='GET', data) {
        const response = await fetch('/api/'+path+'/', {method, headers:{Accept:'application/json', ...(method !== 'GET' ? {'Content-Type':'application/json','X-CSRFToken':csrf()} : {})}, ...(data ? {body:JSON.stringify(data)} : {})});
        const json = response.headers.get('content-type')?.includes('application/json');
        const result = json ? await response.json() : {};
        if (!response.ok) throw Error(message(result) || 'Не удалось выполнить запрос. Обновите страницу.');
        return result;
    }
    function apply(value) {
        state = value;
        document.querySelectorAll('[name=csrfmiddlewaretoken]').forEach(input => input.value=csrf());
        document.querySelectorAll('[data-role]').forEach(element => {
            element.hidden = !({guest:!state.authenticated, user:state.authenticated, admin:state.is_staff})[element.dataset.role];
        });
        document.querySelectorAll('[data-account-open]').forEach(button => {button.textContent=state.authenticated ? state.username : 'Войти';});
        byId('account-member').hidden = !state.authenticated;
        byId('account-guest').hidden = state.authenticated;
        byId('account-username').textContent = state.username;
        byId('account-role-label').textContent = state.is_staff ? 'Администратор' : 'Зарегистрированный пользователь';
        window.dispatchEvent(new CustomEvent('account:changed', {detail:state}));
    }
    function open() {
        document.querySelectorAll('dialog[open]').forEach(other => {if(other !== dialog) other.close();});
        byId('account-error').textContent='';
        if(!dialog.open) dialog.showModal();
        window.dispatchEvent(new Event('account:opened'));
    }
    document.querySelectorAll('[data-account-open], [data-login-required]').forEach(button => button.addEventListener('click',open));
    byId('account-close').onclick=()=>{if(!busy)dialog.close();};
    dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
    dialog.addEventListener('close',()=>window.dispatchEvent(new Event('account:closed')));
    dialog.querySelectorAll('[data-account-tab]').forEach(button => button.onclick=()=>{
        mode=button.dataset.accountTab;
        dialog.querySelectorAll('[data-account-tab]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab===button)));
        dialog.querySelectorAll('[data-registration]').forEach(element=>element.hidden=mode!=='register');
        form.elements.password_confirm.required=mode==='register';
        form.elements.password.autocomplete=mode==='register'?'new-password':'current-password';
        byId('account-submit').textContent=mode==='register'?'Создать аккаунт':'Войти';
        byId('account-error').textContent='';
    });
    form.onsubmit=async event=>{
        event.preventDefault();if(busy)return;busy=true;byId('account-submit').disabled=true;byId('account-error').textContent='';
        try {
            const result=await request(mode==='register'?'register':'session','POST',Object.fromEntries(new FormData(form)));
            apply(result);form.reset();dialog.close();
        } catch(error) {byId('account-error').textContent=error.message || 'Нет связи с сервером.';}
        finally {busy=false;byId('account-submit').disabled=false;}
    };
    byId('account-logout').onclick=async()=>{
        if(busy)return;busy=true;byId('account-logout').disabled=true;
        try { apply(await request('session','DELETE'));dialog.close(); }
        catch(error) {byId('account-error').textContent=error.message;}
        finally {busy=false;byId('account-logout').disabled=false;}
    };
    const ready=request('session').then(value=>{apply(value);return value;}).catch(()=>{apply(state);return state;});
    window.SiteAccount={get state(){return state;}, ready, open, csrf, refresh:async()=>{apply(await request('session'));return state;}};
})();
