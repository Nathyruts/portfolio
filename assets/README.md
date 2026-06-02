# Pasta de imagens

Coloque aqui as imagens do portfolio, por exemplo:

- `sua-foto.jpg`
- `projeto-01.jpg`
- `projeto-01-capa.jpg`
- `projeto-01-detalhe.jpg`

Depois, no HTML, adicione `has-image` no bloco desejado e informe o arquivo:

```html
<a class="project-thumb project-one has-image" href="projeto.html" style="--image: url('assets/projeto-01.jpg')">
  <span>Adicionar imagem</span>
</a>
```

O texto dentro do bloco sera escondido automaticamente quando `has-image` estiver ativo.
