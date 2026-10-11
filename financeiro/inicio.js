
import { createClient } from
    "https://esm.sh/@supabase/supabase-js@2";

import Chart from "https://esm.sh/chart.js@4/auto";

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
const $ = (id) => document.getElementById(id);

const transactionForm = $("transaction-form");
const transactionsList = $("transactions-list");
const message = $("transaction-message");
const saveButton = $("save-button");
const logoutButton = $("logout-button");

let currentUser = null;
let realtimeChannel = null;
let financeChart = null;
let isLoadingTransactions = false;

// MENSAGENS
function showMessage(text, isError = false) {
    message.textContent = text;
    message.style.color = isError ? "#fb7185" : "#4ade80";
}

// FORMATAR DINHEIRO
function formatMoney(value) {
    return Number(value).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// DATA ATUAL
function todayLocal() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// FORMATAR DATA
function formatDate(dateString) {
    if (!dateString) return "";

    const [year, month, day] = dateString.split("-");

    return `${day}/${month}/${year}`;
}

// GRÁFICO FINANCEIRO
function updateFinanceChart(income, expenses) {
    const canvas = $("finance-chart");

    if (!canvas) return;

    if (financeChart) {
        financeChart.data.datasets[0].data = [
            income,
            expenses
        ];

        financeChart.update();
        return;
    }

    financeChart = new Chart(canvas, {
        type: "bar",

        data: {
            labels: ["Entradas", "Despesas"],

            datasets: [{
                label: "Valor em reais",
                data: [income, expenses],
                backgroundColor: ["#4ade80", "#fb7185"],
                borderRadius: 10,
                borderSkipped: false,
                maxBarThickness: 85
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label: (context) =>
                            formatMoney(context.raw)
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },

                    ticks: {
                        color: "#c4c4d8"
                    },

                    border: {
                        display: false
                    }
                },

                y: {
                    beginAtZero: true,

                    grid: {
                        color: "#29293b"
                    },

                    ticks: {
                        color: "#9b9bb3",

                        callback: (value) =>
                            Number(value).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                                maximumFractionDigits: 0
                            })
                    },

                    border: {
                        display: false
                    }
                }
            }
        }
    });
}

// VERIFICAR USUÁRIO CONECTADO
async function checkUser() {
    try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
            window.location.replace("./index.html");
            return;
        }

        currentUser = data.user;

        await loadTransactions();
        subscribeToChanges();

    } catch (error) {
        showMessage(
            "Não foi possível conectar. Confira sua internet.",
            true
        );
    }
}

// CARREGAR MOVIMENTAÇÕES
async function loadTransactions() {
    if (!currentUser || isLoadingTransactions) return;

    isLoadingTransactions = true;

    try {
        const { data, error } = await supabase
            .from("transactions")
            .select(
                "id, description, amount, type, category, transaction_date"
            )
            .eq("user_id", currentUser.id)
            .order("transaction_date", { ascending: false })
            .order("id", { ascending: false });

        if (error) {
            console.error("Erro ao carregar:", error);

            transactionsList.replaceChildren();

            const errorText = document.createElement("p");
            errorText.className = "empty-message";
            errorText.textContent =
                "Não foi possível carregar as movimentações. Confira o banco de dados.";

            transactionsList.appendChild(errorText);

            showMessage("Erro ao carregar movimentações.", true);
            return;
        }

        renderTransactions(data || []);

    } catch (error) {
        console.error(error);
        showMessage("Erro de conexão ao carregar os dados.", true);

    } finally {
        isLoadingTransactions = false;
    }
}

// ATUALIZAR PAINEL E HISTÓRICO
function renderTransactions(transactions) {
    transactionsList.replaceChildren();

    let balance = 0;
    let monthlyIncome = 0;
    let monthlyExpenses = 0;

    const now = new Date();

    const currentMonth =
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    for (const item of transactions) {
        const amount = Number(item.amount);
        const isIncome = item.type === "income";

        // SALDO TOTAL
        balance += isIncome ? amount : -amount;

        // VALORES DO MÊS ATUAL
        if (item.transaction_date?.startsWith(currentMonth)) {
            if (isIncome) {
                monthlyIncome += amount;
            } else {
                monthlyExpenses += amount;
            }
        }

        // CARTÃO DA MOVIMENTAÇÃO
        const itemElement = document.createElement("article");
        itemElement.className = "transaction-item";

        const info = document.createElement("div");
        info.className = "transaction-info";

        const description = document.createElement("strong");
        description.textContent = item.description;

        const details = document.createElement("small");

        details.textContent =
            `${item.category || "Outros"} • ${formatDate(item.transaction_date)}`;

        info.append(description, details);

        const actions = document.createElement("div");
        actions.className = "transaction-actions";

        const value = document.createElement("span");

        value.className = isIncome
            ? "transaction-value income-value"
            : "transaction-value expense-value";

        value.textContent =
            `${isIncome ? "+" : "−"} ${formatMoney(amount)}`;

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Excluir";

        deleteButton.addEventListener("click", () => {
            deleteTransaction(item.id, deleteButton);
        });

        actions.append(value, deleteButton);
        itemElement.append(info, actions);

        transactionsList.appendChild(itemElement);
    }

    // ATUALIZAR VALORES
    $("balance").textContent = formatMoney(balance);

    $("income-total").textContent =
        formatMoney(monthlyIncome);

    $("expense-total").textContent =
        formatMoney(monthlyExpenses);

    // ATUALIZAR GRÁFICO
    updateFinanceChart(monthlyIncome, monthlyExpenses);

    // HISTÓRICO VAZIO
    if (transactions.length === 0) {
        const empty = document.createElement("p");

        empty.className = "empty-message";
        empty.textContent =
            "Nenhuma movimentação ainda. Adicione sua primeira!";

        transactionsList.appendChild(empty);
    }
}

// ADICIONAR MOVIMENTAÇÃO
transactionForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
        showMessage("Entre na sua conta novamente.", true);
        return;
    }

    const description = $("description").value.trim();
    const amount = Number($("amount").value);
    const type = $("type").value;
    const date = $("date").value;

    if (!description || description.length > 120) {
        showMessage("Digite uma descrição válida.", true);
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        showMessage("Digite um valor maior que zero.", true);
        return;
    }

    if (!["income", "expense"].includes(type)) {
        showMessage("Selecione um tipo válido.", true);
        return;
    }

    if (!date) {
        showMessage("Selecione a data da movimentação.", true);
        return;
    }

    saveButton.disabled = true;
    showMessage("Salvando movimentação...");

    try {
        const { error } = await supabase
            .from("transactions")
            .insert({
                user_id: currentUser.id,
                description,
                amount,
                type,
                category: "Outros",
                transaction_date: date
            });

        if (error) {
            console.error("Erro ao salvar:", error);

            showMessage(
                "Não foi possível salvar. Confira a tabela e as permissões do banco.",
                true
            );

            return;
        }

        transactionForm.reset();
        $("date").value = todayLocal();

        showMessage("Movimentação salva com sucesso!");

        await loadTransactions();

    } catch (error) {
        console.error(error);
        showMessage("Erro de conexão. Tente novamente.", true);

    } finally {
        saveButton.disabled = false;
    }
});

// EXCLUIR MOVIMENTAÇÃO
async function deleteTransaction(id, button) {
    if (!currentUser) return;

    const confirmed = window.confirm(
        "Tem certeza de que deseja excluir esta movimentação?"
    );

    if (!confirmed) return;

    button.disabled = true;

    try {
        const { error } = await supabase
            .from("transactions")
            .delete()
            .eq("id", id)
            .eq("user_id", currentUser.id);

        if (error) {
            console.error("Erro ao excluir:", error);

            showMessage(
                "Não foi possível excluir a movimentação.",
                true
            );

            button.disabled = false;
            return;
        }

        showMessage("Movimentação excluída com sucesso!");

        await loadTransactions();

    } catch (error) {
        console.error(error);
        showMessage("Erro de conexão ao excluir.", true);
        button.disabled = false;
    }
}

// ATUALIZAÇÕES EM TEMPO REAL
function subscribeToChanges() {
    if (!currentUser) return;

    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
    }

    realtimeChannel = supabase
        .channel("transactions-" + currentUser.id)
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "transactions",
                filter: "user_id=eq." + currentUser.id
            },
            () => {
                loadTransactions();
            }
        )
        .subscribe();
}

// SAIR DA CONTA
logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            showMessage("Não foi possível sair da conta.", true);
            logoutButton.disabled = false;
            return;
        }

        window.location.replace("./index.html");

    } catch (error) {
        showMessage("Erro ao sair da conta.", true);
        logoutButton.disabled = false;
    }
});

// INICIAR PÁGINA
$("date").value = todayLocal();

checkUser();
