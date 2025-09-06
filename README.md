# Encrucillado en Galego

Un xogo educativo de encrucillado deseñado especialmente para persoas que aprenden galego. Baséase na arquitectura do proxecto sopa de letras existente e ofrece unha experiencia de aprendizaxe gamificada.

**🎮 Xogar Online**: [https://encrucillado.cursos.gal/](https://encrucillado.cursos.gal/)  
**📂 Repositorio**: [https://github.com/sanchezanxo/encrucillado-en-galego](https://github.com/sanchezanxo/encrucillado-en-galego)

**Desenvolto por**: Anxo Sánchez (@sanchezanxo) para cursos.gal  
**Ferramentas**: Claude Code e VS Code  
**Lista de palabras**: creada por ChatGPT - poden conter erros que se irán corrixindo

## Opcións de Uso

- **🌐 Xogar Online**: accede directamente a [https://encrucillado.cursos.gal/](https://encrucillado.cursos.gal/)
- **💾 Descargar e Instalar**: descarga este repositorio e instálao no teu hosting

## Características

### Xogo Principal
- **Encrucillado dinámico**: xeración automática de encrucillados con palabras galegas
- **Tres niveis de dificultade**: fácil (6 palabras), medio (9 palabras), difícil (13 palabras)
- **Temporizador**: límite de tempo diferente para cada nivel (300s, 240s, 180s)
- **Sistema de puntuación**: 10 puntos por letra + bonus de tempo
- **Responsive**: optimizado para PC, tablet e móbil

### Contido Educativo
- **Palabras galegas**: vocabulario relacionado con cultura, xeografía e tradicións galegas
- **Definicións**: cada palabra inclúe a súa definición como pista
- **Aprendizaxe progresiva**: dificultade escalonada por niveis

### Tecnoloxías
- **Frontend**: HTML5, CSS3, JavaScript vanilla
- **Backend**: PHP (XAMPP)
- **Base de datos**: Sistema baseado en arquivos JSON
- **Deseño**: Mobile-first, CSS Grid

## Instalación e Configuración

### Para Instalar no Teu Hosting
1. Descarga ou clona este repositorio
2. Sube os arquivos ao teu servidor web (Apache + PHP)
3. Configura os permisos do directorio `private/`
4. Accede ao teu dominio para xogar

**Se fas un fork ou usas este código, por favor menciona a fonte orixinal.**

### Configuración de Seguridade (Primeira vez)
1. Copia `private/config.example.php` a `private/config.php`
2. Cambia o contrasinal por defecto no panel de administración
3. Configura os permisos do directorio `private/`

### Arquivos de Datos
- `data/palabras.json`: Contén todas as palabras con definicións
- `private/scores.json`: Almacena as puntuacións (créase automaticamente)
- `private/rate_limit.json`: Control de límites de peticions

## Estrutura do Proxecto

```
encrucillado2/
├── index.html              # Interfaz principal do xogo
├── css/
│   └── styles.css         # Estilos responsive con variables CSS
├── js/
│   ├── main.js           # Lóxica principal e xestión do estado
│   └── game.js           # Xeración do crucigrama e colocación de palabras
├── data/
│   ├── config.json       # Configuración de niveis
│   └── palabras.json     # Base de datos de palabras galegas
├── private/
│   ├── admin.php         # Panel de administración
│   ├── save_lead.php     # Gardado de puntuacións
│   ├── get_stats.php     # Obtención de estatísticas
│   ├── config.php        # Configuración de seguridade
│   └── *.json           # Arquivos de datos
└── assets/              # Recursos adicionais
```

## Como Xogar

1. **Seleccionar Nivel**: escolle entre Fácil, Medio ou Difícil
2. **Ler Pistas**: consulta as definicións nas listas "Horizontais" e "Verticais"
3. **Clickar Celda**: fai clic nunha celda para seleccionar unha palabra
4. **Escribir Resposta**: usa o teclado para introducir a palabra
5. **Verificación**: preme Enter para verificar ou a palabra complétase automaticamente
6. **Completar**: atopa todas as palabras antes de que se acabe o tempo

### Controis
- **PC**: Teclado estándar + clic do rato
- **Móbil**: Toque na pantalla + teclado virtual
- **Teclas especiais**: 
  - Enter: Verificar palabra
  - Backspace: Borrar letra
  - Escape: Cancelar selección

### Consellos de Uso
- **Celdas compartidas**: cando duas palabras se cruzan nunha celda, fai clic várias veces na mesma celda para alternar entre as palabras horizontal e vertical
- **Verificación automática**: ao completar unha palabra, verifícase automaticamente sen necesidade de premer Enter
- **Selección visual**: a palabra activa móstrase destacada en azul, e a celda actual en verde

## Administración

### Panel de Administración
Acceso: `http://localhost/encrucillado2/private/admin.php`

Funcionalidades:
- Ver estatísticas de xogo
- Consultar ranking de xogadores
- Xestionar puntuacións
- Configuración de seguridade

### Engadir Palabras
Edita `data/palabras.json`:
```json
{
  "palabras": [
    {
      "palabra": "GAITA",
      "definicion": "Instrumento musical tradicional galego"
    },
    {
      "palabra": "QUEIMADA", 
      "definicion": "Bebida típica galega con orujo e azucre"
    }
  ]
}
```

### Configuración de Niveis
Modifica `data/config.json` para cambiar dificultades:
```json
{
  "niveis": [
    {"id": 1, "palabras": 6, "tempo": 300, "tema": "Fácil"},
    {"id": 2, "palabras": 9, "tempo": 240, "tema": "Medio"},
    {"id": 3, "palabras": 13, "tempo": 180, "tema": "Difícil"}
  ]
}
```

## Desenvolvemento

### Arquitectura do Código
- **Configuración central**: Obxecto `CONFIG` para axustes
- **Estado do xogo**: Obxecto `gameState` para xestión do estado
- **Programación defensiva**: Try-catch e validacións
- **Optimización móbil**: Teclado virtual sen scroll
- **Variables CSS**: Tema centralizado e mantemento fácil

### Funcións Principais
- `generateCrossword()`: xeración do encrucillado
- `findAndPlaceWord()`: Algoritmo de colocación optimizado  
- `handleKeyPress()`: Xestión de entrada de teclado
- `checkCurrentWord()`: Verificación de palabras
- `renderCrosswordGrid()`: Renderizado da grella

### Estilos CSS
- Variables CSS para cores e tamaños
- Design mobile-first
- Smooth transitions (0.3s ease)
- CSS Grid para layout do encrucillado
- Esquema de cores galego tradicional

## Seguridade

### Medidas Implementadas
- Hash de contrasinais con `password_hash()`
- Límite de intentos de login
- Rate limiting en APIs
- Validación de entrada
- Protección de arquivos sensibles con .htaccess
- Xestión de sesións seguras

### Arquivos Sensibles
- `private/config.php`: Nunca subir ao control de versións
- `private/*.json`: Datos sensibles, protexidos por .htaccess
- `.env` ou similares: Usar `.gitignore`

## Contribución

### Estilo de Código
- Comentarios en galego para funcións
- Variables descritivas
- Funcións pequenas e específicas
- Sin emojis no código
- Indentación consistente

### Como Contribuír
1. Fai fork do proxecto
2. Crea unha branch para a túa característica
3. Fai commits con mensaxes descritivas
4. Abre un pull request

## Licenza

Proxecto educativo de código aberto para a promoción da lingua galega.

## Soporte

Para problemas técnicos ou suxestións:
- Comproba os logs do navegador (F12 → Console)
- Revisa os logs de Apache en XAMPP
- Verifica que os arquivos JSON sexan válidos
- Confirma que o servidor web está en execución

## Notas de Versión

### v2.0.0 (Actual)
- Implementación completa do encrucillado
- Sistema de puntuación e ranking
- Soporte móbil optimizado
- Panel de administración seguro
- Variables CSS e código limpo
- Algoritmo de xeración optimizado

### Próximas Melloras
- Máis palabras galegas
- Soporte para temas personalizados
- Modo multixogador
- Integración con redes sociais
- Análise de aprendizaxe

---

**Desenvolvido para promover e ensinar a lingua galega de forma interactiva e divertida.**