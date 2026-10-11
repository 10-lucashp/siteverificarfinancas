
import { createClient } from
    "https://esm.sh/@supabase/supabase-js@2";

// CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL =
    "https://dypjaupmgwfygzvsjsie.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_M0XG6ZQGyTvgcEH0S_G36A_o0aZfFXh";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

// ELEMENTOS DO HTML
const authForm = document.getElementById("auth-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupButton = document.getElementById("signup-button");
const loginButton = document.getElementById("login-button");
const message = document.getElementById("auth-message");

// MOSTRAR MENSAGENS
function showMessage(text, isError = false) {
    message.textContent = text;
    message.style.color = isError ? "#fb7185" : "#4ade80";
}

// ATIVAR E DESATIVAR BOTÕES
function setLoading(loading) {
    loginButton.disabled = loading;
    signupButton.disabled = loading;
}

// PEGAR E-MAIL E SENHA
function getCredentials() {
    return {
        email: emailInput.value.trim(),
        password: passwordInput.value
    };
}

// VERIFICAR SE JÁ ESTÁ CONECTADO
async function checkSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
        showMessage(
            "Não foi possível verificar sua sessão.",
            true
        );
        return;
    }

    if (data.session) {
        window.location.replace("./inicio.html");
    }
}

// ENTRAR NA CONTA
authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const { email, password } = getCredentials();

    setLoading(true);
    showMessage("Entrando na sua conta...");

    try {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            showMessage(
                "Não foi possível entrar. Confira seu e-mail e sua senha.",
                true
            );
            return;
        }

        window.location.href = "./inicio.html";

    } catch (error) {
        console.error(error);
        showMessage(
            "Erro de conexão. Tente novamente.",
            true
        );

    } finally {
        setLoading(false);
    }
});

// CRIAR CONTA
signupButton.addEventListener("click", async () => {
    const { email, password } = getCredentials();

    if (!email || !password) {
        showMessage(
            "Digite seu e-mail e sua senha primeiro.",
            true
        );
        return;
    }

    if (password.length < 6) {
        showMessage(
            "Sua senha precisa ter pelo menos 6 caracteres.",
            true
        );
        return;
    }

    setLoading(true);
    showMessage("Criando sua conta...");

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo:
                    window.location.origin +
                    window.location.pathname.replace(
                        /[^/]*$/,
                        "inicio.html"
                    )
            }
        });

        if (error) {
            console.error(error);
            showMessage(
                "Erro no cadastro: " + error.message,
                true
            );
            return;
        }

        if (data.session) {
            window.location.href = "./inicio.html";
        } else {
            showMessage(
                "Conta criada! Confira seu e-mail para confirmar o cadastro."
            );
        }

    } catch (error) {
        console.error(error);
        showMessage(
            "Erro de conexão. Tente novamente.",
            true
        );

    } finally {
        setLoading(false);
    }
});

// INICIAR
checkSession();
