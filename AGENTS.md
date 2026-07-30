# Retratos editoriais dos palestrantes

Use esta receita sempre que um novo participante for adicionado ao site. O objetivo é manter todos os retratos com a mesma linguagem visual dos arquivos em `imagens/palestrantes/`.

## Referências visuais do padrão

- Formato vertical `4:5`, com saída final de `900 × 1125 px`.
- Retrato fotográfico realista de estúdio, enquadrado do peito para cima.
- Câmera na altura dos olhos, rosto e olhos em foco, cabeça inteira e ombros visíveis.
- Fundo contínuo azul-petróleo profundo inspirado em `#00223E`, sem objetos ou textura cenográfica.
- Luz principal grande, suave e natural a aproximadamente 45 graus.
- Preenchimento discreto e frio para separar o rosto do fundo.
- Um único recorte de luz magenta `#F5017A`, muito sutil, em apenas uma lateral do cabelo ou do ombro. O magenta é acento, nunca a cor dominante.
- Roupa sóbria em azul-marinho, grafite, preto ou ameixa, sem marcas e sem estampas chamativas.
- Pele, cabelo, idade, expressão e detalhes pessoais naturais; sem aparência plástica ou retoque de beleza excessivo.

## Fluxo obrigatório

1. Separe de uma a quatro fotografias nítidas da mesma pessoa. Prefira uma vista frontal e uma em três quartos, com boa resolução e sem filtros.
2. Inspecione as referências antes de gerar. Identifique formato do rosto, olhos, nariz, boca, linha do cabelo, idade aparente, tom de pele, óculos e demais características que não podem mudar.
3. Use o Imagegen em modo de edição com as fotos anexadas como referências. Nunca gere a pessoa apenas por descrição.
4. Use o prompt-base abaixo, substituindo `[NOME]`. Se houver mais de uma referência, informe que todas mostram a mesma pessoa.
5. Compare o resultado em tamanho real com as referências. Rejeite qualquer imagem que altere identidade, idade, formato dos olhos, sorriso, dentes, cabelo, óculos ou proporções faciais.
6. Exporte a versão aprovada para `imagens/palestrantes/[nome-em-kebab-case].webp`.
7. Ao inserir no HTML, use `width="900"`, `height="1125"` e um texto alternativo como `Retrato de [NOME]`.

## Prompt-base para o Imagegen

```text
Edit the attached reference photograph(s) into a premium, photorealistic editorial studio portrait of [NOME]. Every reference depicts the same person. Preserve the person's identity exactly: facial geometry, eyes, nose, mouth, smile, teeth, jawline, hairline, hairstyle, skin tone, age, glasses and all recognizable traits must remain faithful to the references.

Create a vertical 4:5 chest-up portrait, photographed at eye level with an 85 mm portrait-lens look. Keep the full head and both shoulders inside the frame, with balanced breathing room above the hair. Use a composed, approachable and natural expression. The eyes must be tack sharp.

Place the subject against a clean, seamless, deep petroleum-blue studio background matching #00223E, with only a restrained tonal falloff. Light the face with a large soft key light at approximately 45 degrees, a very subtle cool fill, and one thin magenta rim light matching #F5017A along only one outer edge of the hair or shoulder. Magenta must occupy less than 8% of the image and must never wash over the face or background.

Keep realistic skin pores, fine lines, hair strands and natural facial asymmetry. Use understated smart-casual clothing in navy, charcoal, black or muted plum, with no logos, text or distracting patterns. Match the polished, dignified and contemporary visual language of an important cultural congress.

Do not beautify, de-age, reshape, stylize or idealize the face. Do not create waxy skin, excessive makeup, artificial teeth, extra accessories, dramatic neon lighting, a bright magenta background, scenery, props, text, logos, borders, painterly effects or illustration. The result must look like a real photograph made during the same studio session as the existing speaker portraits.
```

## Exportação

Use o ImageMagick para recortar no centro, remover metadados e gerar o WebP final:

```bash
magick imagem-aprovada.png \
  -auto-orient \
  -resize '900x1125^' \
  -gravity center \
  -extent 900x1125 \
  -strip \
  -define webp:method=6 \
  -quality 84 \
  imagens/palestrantes/nome-do-palestrante.webp
```

Confirme as dimensões:

```bash
sips -g pixelWidth -g pixelHeight imagens/palestrantes/nome-do-palestrante.webp
```

## Critérios de aprovação

- Identidade imediatamente reconhecível quando comparada às referências.
- Exatamente `900 × 1125 px`, proporção `4:5`.
- Fundo azul-petróleo limpo e coerente com os demais retratos.
- Acento magenta fino e localizado em uma única borda.
- Pele natural, olhos nítidos e anatomia sem artefatos.
- Sem texto, logotipo, cenário, objetos ou elementos religiosos adicionados.
- Arquivo WebP visualmente limpo; prefira até aproximadamente `200 KB`, sem sacrificar o rosto.

Se qualquer critério falhar, regenere a partir das referências originais em vez de corrigir manualmente o rosto.
