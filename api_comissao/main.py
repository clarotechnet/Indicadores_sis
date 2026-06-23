import os
import requests
from datetime import date
from dotenv import load_dotenv
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI(title="API Comissão Imperium")

BASE_SITE = "https://www.sistemaimperium.com.br"
BASE_TECHNET = f"{BASE_SITE}/technet"
LOGIN_URL = f"{BASE_TECHNET}/login"

USUARIO = os.getenv("IMPERIUM_USUARIO")
SENHA = os.getenv("IMPERIUM_SENHA")

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:8080")
origins = [item.strip() for item in cors_origins.split(",") if item.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def extrair_token(dados):
    if isinstance(dados, str):
        return dados if dados.count(".") == 2 else None

    if isinstance(dados, dict):
        chaves_token = [
            "token",
            "access_token",
            "jwt",
            "authorization",
            "Authorization",
            "bearer",
        ]

        for chave in chaves_token:
            valor = dados.get(chave)
            if isinstance(valor, str) and valor:
                return valor.replace("Bearer ", "").strip()

        for valor in dados.values():
            token = extrair_token(valor)
            if token:
                return token

    if isinstance(dados, list):
        for item in dados:
            token = extrair_token(item)
            if token:
                return token

    return None


def tratar_comissao(dados):
    registros = dados.get("data", dados if isinstance(dados, list) else [])

    resumo = []
    detalhado = []

    for instalador in registros:
        id_instalador = instalador.get("IdInstalador")
        nome_abreviado = instalador.get("NomeAbreviado")
        comissoes = instalador.get("Comissoes", [])

        total_valor = 0
        total_qtd_contrato = 0
        total_qtd_os = 0
        total_valor_instalador = 0
        total_valor_auxiliar = 0

        for item in comissoes:
            valor = float(item.get("Valor") or 0)
            valor_instalador = float(item.get("ValorInstalador") or 0)
            valor_auxiliar = float(item.get("ValorAuxiliar") or 0)
            qtd_contrato = int(item.get("QtdContrato") or 0)
            qtd_os = int(item.get("QtdOs") or 0)

            total_valor += valor
            total_valor_instalador += valor_instalador
            total_valor_auxiliar += valor_auxiliar
            total_qtd_contrato += qtd_contrato
            total_qtd_os += qtd_os

            detalhado.append({
                "IdInstalador": id_instalador,
                "NomeAbreviado": nome_abreviado,
                "IdComissionamento": item.get("IdComissionamento"),
                "Produto": item.get("Produto"),
                "QtdContrato": qtd_contrato,
                "QtdOs": qtd_os,
                "Valor": valor,
                "ValorInstalador": valor_instalador,
                "ValorAuxiliar": valor_auxiliar,
            })

        resumo.append({
            "IdInstalador": id_instalador,
            "NomeAbreviado": nome_abreviado,
            "QtdProdutos": len(comissoes),
            "QtdContrato": total_qtd_contrato,
            "QtdOs": total_qtd_os,
            "TotalValor": round(total_valor, 2),
            "TotalValorInstalador": round(total_valor_instalador, 2),
            "TotalValorAuxiliar": round(total_valor_auxiliar, 2),
        })

    resumo = sorted(resumo, key=lambda item: item["TotalValor"], reverse=True)

    return {
        "resumo": resumo,
        "detalhado": detalhado,
    }


def buscar_comissao(data_ini: str, data_fim: str):
    if not USUARIO or not SENHA:
        raise HTTPException(
            status_code=500,
            detail="Credenciais do Imperium não configuradas no .env."
        )

    session = requests.Session()

    headers_login = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "Origin": BASE_SITE,
        "Referer": LOGIN_URL,
    }

    payload_login = {
        "jwtusername": USUARIO,
        "jwtpassword": SENHA,
    }

    login_response = session.post(
        LOGIN_URL,
        json=payload_login,
        headers=headers_login,
        timeout=30,
        allow_redirects=True,
    )

    if login_response.status_code not in [200, 201, 204]:
        raise HTTPException(
            status_code=502,
            detail={
                "mensagem": "Login no Imperium falhou.",
                "status": login_response.status_code,
                "resposta": login_response.text[:500],
            }
        )

    token = None

    try:
        dados_login = login_response.json()
        token = extrair_token(dados_login)
    except Exception:
        token = None

    headers_api = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json, text/plain, */*",
        "Referer": BASE_TECHNET,
    }

    if token:
        headers_api["Authorization"] = f"Bearer {token}"

    api_url = f"{BASE_TECHNET}/comissaoservicos/comissao/instaladores/{data_ini}/{data_fim}"

    api_response = session.get(
        api_url,
        headers=headers_api,
        timeout=60,
        allow_redirects=True,
    )

    if api_response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail={
                "mensagem": "Erro ao buscar comissão no Imperium.",
                "status": api_response.status_code,
                "url": api_url,
                "resposta": api_response.text[:500],
            }
        )

    try:
        dados = api_response.json()
    except Exception:
        raise HTTPException(
            status_code=502,
            detail={
                "mensagem": "Resposta do Imperium não veio em JSON.",
                "resposta": api_response.text[:500],
            }
        )

    return tratar_comissao(dados)


@app.get("/")
def home():
    return {
        "status": "online",
        "servico": "API Comissão Imperium"
    }


@app.get("/comissao")
def comissao(
    data_ini: date = Query(...),
    data_fim: date = Query(...),
):
    if data_ini > data_fim:
        raise HTTPException(
            status_code=400,
            detail="data_ini não pode ser maior que data_fim."
        )

    resultado = buscar_comissao(
        data_ini=data_ini.isoformat(),
        data_fim=data_fim.isoformat()
    )

    return {
        "success": True,
        "data_ini": data_ini.isoformat(),
        "data_fim": data_fim.isoformat(),
        "resumo": resultado["resumo"],
        "detalhado": resultado["detalhado"],
    }