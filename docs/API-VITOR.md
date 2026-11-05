# API do CRM para as IAs de WhatsApp (Vitor 0800 e Camila, número novo)

Base: `https://www.crmmodocorre.com.br/api/ai` · Somente HTTPS · JSON UTF-8
Cabeçalho em todas as chamadas: `x-ai-key: <chave do Vitor>` (a Camila usa a mesma chave)
Cabeçalho `Idempotency-Key: <id único da ação>` obrigatório em POST e PATCH (repetir a mesma chamada com a mesma chave não duplica; devolve a mesma resposta). Use uma chave nova para cada ação.

**Origem = qual IA está falando.** `whatsapp_0800` (padrão) = Vitor · `whatsapp_camila` = Camila. A IA da origem vira o SDR padrão do lead (`vitor-ia` / `camila-ia`) e assina histórico e anotações.

| Método | Endereço | Para quê |
|---|---|---|
| GET | `/leads/busca?telefone=+5511999999999` | Lead existe? → `{ id, etapa, vendedor_id }` ou 404 |
| POST | `/leads` | Cria ou atualiza pelo telefone |
| PATCH | `/leads/{id}` | Closer, SDR, etapa (`primeiro_contato`/`agendado`/`nao_compareceu`), reunião, UTM e origem |
| GET | `/leads/{id}/anotacoes` | Todas as anotações do lead (de qualquer autor) |
| POST | `/leads/{id}/anotacoes` | Anotação assinada pela IA do canal do lead |
| GET | `/vendedores?papel=closer` | Closers ativos `{ id, nome, fila }` |

**POST /leads**
```json
{ "nome": "João Silva", "telefone": "+5511999999999", "email": "joao@email.com",
  "origem": "whatsapp_camila", "faixa_capital": "de_100k_a_150k", "perfil": "ja_conhece",
  "observacao": "Quer 5 motos", "vendedor_id": "<id do closer>",
  "utm_source": "FaceAds", "utm_campaign": "<nome da campanha>", "utm_content": "<nome do criativo>", "utm_anuncio": "<id do anúncio>" }
```
→ `201 { "ok": true, "id": "…", "acao": "criado", "etapa": "primeiro_contato" }` ou `200 { …, "acao": "atualizado" }`
- `nome` obrigatório só para criar. `faixa_capital`: acima_150k · de_100k_a_150k · de_60k_a_100k · de_30k_a_60k · ate_30k · nao_informado. A `prioridade` (alta/media/menor) é calculada pela faixa.
- `origem`: `whatsapp_0800` (padrão) ou `whatsapp_camila`. `sdr_id` (opcional): `vitor-ia` ou `camila-ia`; sem ele, vale a IA da origem.
- UTMs aceitas: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_anuncio`.
- Em lead que já existe, UTM, origem e SDR **só preenchem campo vazio** (a atribuição original é preservada). Para corrigir, use o PATCH.
- `perfil: "locacao"` → lead vai para **Declinados** com motivo Locação.
- Lead declinado que volta a falar → reativado em `primeiro_contato`.
- Lead já com o closer (reunião feita em diante) não muda de etapa; os dados são atualizados e a observação é acrescentada, nunca apagada.

**PATCH /leads/{id}** — campos aceitos: `vendedor_id`, `sdr_id`, `etapa`, `data_reuniao`, `link_reuniao`, `utm_source`, `utm_campaign`, `utm_content`, `utm_anuncio`, `origem`
```json
{ "vendedor_id": "<id do closer>", "etapa": "agendado",
  "data_reuniao": "2026-10-28T14:30:00-03:00", "link_reuniao": "https://meet.google.com/abc-defg-hij" }
```
```json
{ "utm_anuncio": "120248550188470133", "utm_campaign": "<nome da campanha>", "utm_content": "<nome do criativo>",
  "origem": "whatsapp_camila", "sdr_id": "camila-ia" }
```
→ `200 { "ok": true, "id": "…", "etapa": "…", "alterados": ["utm_anuncio", "origem", …] }` (`alterados` vazio = nada mudou).
- Para `agendado` são obrigatórios closer e data. **Fila** (`fila: true` na lista de closers) recebe lead, mas não recebe reunião → 409.
- **Não compareceu:** `{ "etapa": "nao_compareceu" }`. Só para lead em `agendado` (outra etapa → 409); não envie `data_reuniao` junto (400). A reunião deixa de contar como ocupada na agenda da Camila, porque o lead sai de `agendado`.
- **Remarcar quem não compareceu:** `{ "etapa": "agendado", "data_reuniao": "<nova data>", "link_reuniao": "…" }`. A nova `data_reuniao` é obrigatória (400 sem ela).
- UTM e origem: em lead **criado pela IA** o valor é corrigido. Em lead que veio de outro canal (formulário etc.) só preenche campo vazio; se já tiver valor diferente → 409.
- `sdr_id`: só `vitor-ia` ou `camila-ia`. Se o lead já tem SDR humano → 409.
- Toda mudança de UTM, origem, SDR e closer fica registrada na auditoria do CRM (valor anterior → novo, data/hora e chave).

**GET /leads/{id}/anotacoes**
→ `200 { "ok": true, "total": 2, "anotacoes": [ { "id": "…", "texto": "…", "arquivo_url": null, "criado_em": "…", "autor": { "id": "…", "nome": "Hercules", "tipo": "vendedor", "ia": false } } ] }` (da mais antiga à mais nova)

**POST /leads/{id}/anotacoes** → `{ "texto": "Resumo: …" }` → `201 { "ok": true, "id": "…", "criado_em": "…" }`

**Erros** → `{ "ok": false, "erro": { "codigo": "…", "mensagem": "…" } }`
400 dado_invalido · 401 chave_invalida · 403 sem_permissao (ex.: etapa `fechado`, campo fora da lista, listar ou excluir leads) · 404 nao_encontrado · 409 conflito (Idempotency-Key reutilizada com outro corpo; lead já com o closer; Fila não recebe reunião; atribuição original ou SDR humano) · 429 limite_excedido (60/min, veja `Retry-After`)
