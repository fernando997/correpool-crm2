# API do CRM para o Vitor (SDR IA do WhatsApp 0800)

Base: `https://www.crmmodocorre.com.br/api/ai` · Somente HTTPS · JSON UTF-8
Cabeçalho em todas as chamadas: `x-ai-key: <chave do Vitor>`
Cabeçalho `Idempotency-Key: <id único da ação>` obrigatório em POST e PATCH (repetir a mesma chamada com a mesma chave não duplica; devolve a mesma resposta).

| Método | Endereço | Para quê |
|---|---|---|
| GET | `/leads/busca?telefone=+5511999999999` | Lead existe? → `{ id, etapa, vendedor_id }` ou 404 |
| POST | `/leads` | Cria ou atualiza pelo telefone |
| PATCH | `/leads/{id}` | Closer, etapa (`primeiro_contato`/`agendado`), reunião |
| POST | `/leads/{id}/anotacoes` | Anotação com autor "Vitor (IA)" |
| GET | `/vendedores?papel=closer` | Closers ativos `{ id, nome }` |

**POST /leads**
```json
{ "nome": "João Silva", "telefone": "+5511999999999", "email": "joao@email.com",
  "origem": "whatsapp_0800", "faixa_capital": "de_100k_a_150k", "perfil": "ja_conhece",
  "observacao": "Quer 5 motos", "vendedor_id": "<id do closer>", "utm_source": "whatsapp" }
```
→ `201 { "ok": true, "id": "…", "acao": "criado", "etapa": "primeiro_contato" }` ou `200 { …, "acao": "atualizado" }`
- `nome` obrigatório só para criar. `faixa_capital`: acima_150k · de_100k_a_150k · de_60k_a_100k · de_30k_a_60k · ate_30k · nao_informado. A `prioridade` (alta/media/menor) é calculada pela faixa.
- `perfil: "locacao"` → lead vai para **Declinados** com motivo Locação.
- Lead declinado que volta a falar → reativado em `primeiro_contato`.
- Lead já com o closer (reunião feita em diante) não muda de etapa; os dados são atualizados e a observação é acrescentada, nunca apagada.

**PATCH /leads/{id}** (agendar)
```json
{ "vendedor_id": "<id do closer>", "etapa": "agendado",
  "data_reuniao": "2026-10-28T14:30:00-03:00", "link_reuniao": "https://meet.google.com/abc-defg-hij" }
```
→ `200 { "ok": true, "id": "…", "etapa": "agendado" }`. Para `agendado` são obrigatórios closer e data.

**POST /leads/{id}/anotacoes** → `{ "texto": "Resumo: …" }` → `201 { "ok": true, "id": "…", "criado_em": "…" }`

**Erros** → `{ "ok": false, "erro": { "codigo": "…", "mensagem": "…" } }`
400 dado_invalido · 401 chave_invalida · 403 sem_permissao (ex.: etapa `fechado`, listar ou excluir leads) · 404 nao_encontrado · 409 conflito (Idempotency-Key reutilizada com outro corpo; lead já com o closer) · 429 limite_excedido (60/min, veja `Retry-After`)
