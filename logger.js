const SUPABASE_URL = 'https://nlybbvlhhdjjmqkzjnhx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tb_WPtZc6awrzrQrDvYUxQ_ndUpe-Au';

// Use ONE global client
window._supabase = window._supabase || supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.logAction = async function(action, page) {
    console.log('🔥 logAction called:', action, page);

    try {
        const { data: { user } } = await window._supabase.auth.getUser();

        const { data, error } = await window._supabase
            .from('logs')
            .insert([{
                action,
                page,
                user_id: user?.id || null
            }]);

        console.log('📦 insert result:', { data, error });

        if (error) throw error;

    } catch (err) {
        console.error('❌ Logging failed:', err);
    }
};
