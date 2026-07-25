"""Asset manifest for PAPERWEIGHT.

Every entry is one GPT Image 2 generation. `kind` drives post-processing:
  bg      -> cover-fit to 960x540, opaque
  sheet   -> chroma-key magenta, slice into rows x cols, autocrop, save as <name>_<i>.png
  cutout  -> chroma-key magenta, autocrop, fit inside a box
  ui      -> chroma-key magenta, keep whole
  raw     -> chroma-key nothing, just resize
"""

# ---------------------------------------------------------------- style ----

STYLE = (
    "hand-drawn children's storybook illustration, coloured pencil and soft ink "
    "linework with visible paper grain, gentle and cute, slightly melancholy, "
    "muted warm pastel palette (mustard yellow, dusty rose, sage green, cream, "
    "faded brick) sitting against deep navy and plum shadows, soft rounded shapes, "
    "no text, no words, no letters, no numbers, no watermark, no signature, "
    "no border, no frame"
)

BG_VIEW = (
    "flat three-quarter overhead view like a classic 2D japanese role-playing game "
    "map screen, camera looking down at roughly 60 degrees, the walkable floor fills "
    "the lower two thirds of the frame and is left open and uncluttered in the middle, "
    "walls and tall furniture along the top edge, no characters, no people, no creatures, "
    "entire scene visible, nothing cropped by the frame edges"
)

BATTLE_VIEW = (
    "empty environment backdrop for a turn-based battle screen, seen straight on at eye "
    "level, slightly out of focus and dreamlike, no characters, no people, no creatures, "
    "no user interface, simple and uncluttered with the middle of the image kept calm "
    "and low-contrast so that figures can be drawn on top of it"
)

MAGENTA = (
    "isolated on a completely flat solid pure magenta background (hex FF00FF), the "
    "magenta must be perfectly uniform with no gradient, no shadow, no texture and no "
    "vignette, nothing else in the image"
)

GRID2 = (
    "arranged as a clean 2 by 2 grid of four equal square panels separated by thin "
    "pure white dividing lines, each panel the same size, each subject drawn at the "
    "same scale and centred inside its own panel"
)

# ------------------------------------------------------------ characters ----

JUNE = (
    "JUNE, a quiet 12-year-old girl: short dark chestnut-brown bob with a blunt straight "
    "fringe, pale skin, very large dark round eyes, small mouth, wearing a mustard-yellow "
    "raincoat left open over a cream dress and dark red rubber boots, and a little crown "
    "folded out of newspaper sitting on her head"
)
DELL = (
    "DELL, a round-faced 12-year-old boy: messy copper-red hair, heavy freckles across the "
    "nose, cheerful gap-toothed face, wearing a much-too-big forest-green anorak with the "
    "hood down and a striped red-and-cream scarf, scuffed knees, carrying a dented tin "
    "lantern hanging from a short wooden stick"
)
WICK = (
    "WICK, a small floating creature the size of a teapot: an antique brass oil lamp with a "
    "rounded glass belly, a warm heart-shaped flame burning inside it, a pair of large pale "
    "cream luna-moth wings with faint crescent-moon markings, and two tiny round black dot "
    "eyes on the glass, no arms, no legs, gently glowing"
)
HAL = (
    "HAL, a tall calm 15-year-old girl: long straight black hair cut bluntly at the "
    "shoulders, sleepy half-lidded grey eyes, flat unbothered expression, wearing an oversized "
    "dove-grey knitted cardigan with sleeves past her hands over a black turtleneck and a long "
    "skirt, her left hand wrapped in clean white bandage, holding a wooden spool of red thread"
)
NEL = (
    "NEL, a small kind elderly woman: soft silver hair pinned in a loose bun, round wire "
    "glasses, deeply crinkled warm smile, wearing a lavender cardigan under a faded floral "
    "apron, slightly stooped"
)

# --------------------------------------------------------------- entries ----

ASSETS = [
    # ============================ ROOM BACKGROUNDS ============================
    dict(name="bg_bedroom", kind="bg", size="1536x1024", prompt=(
        f"A child's small bedroom late at night during a rainstorm. {BG_VIEW} "
        "A single bed with a patchwork quilt against the left wall, a wooden desk with a "
        "lit brass reading lamp, a tall shelf holding a glass snow-globe-like paperweight that "
        "glows faintly, a rag rug on bare floorboards, and a window on the back wall streaming "
        "with rain and blue night light. Cosy, dim, lonely, warm pool of lamplight on the floor. "
        f"{STYLE}")),

    dict(name="bg_landing", kind="bg", size="1536x1024", prompt=(
        f"A narrow upstairs landing of an old family house at night. {BG_VIEW} "
        "Faded rose wallpaper, three closed doors along the back wall, one of them slightly ajar "
        "with warm light spilling out, a small side table with a dead potted fern and a stopped "
        "carriage clock, stairs descending out of frame at the bottom right. Very quiet, dim, "
        f"blue shadows with one warm sliver of light. {STYLE}")),

    dict(name="bg_street", kind="bg", size="1536x1024", prompt=(
        f"A small sleepy town street at dusk just after rain. {BG_VIEW} "
        "Wet grey asphalt reflecting light down the middle, a corner shop on the left with a warm "
        "glowing window and an awning, leaning telephone poles with sagging wires, a bent bicycle "
        "rack, puddles, a scatter of wet yellow leaves, low houses along the back. Melancholy, "
        f"peaceful, lilac and amber evening light. {STYLE}")),

    dict(name="bg_hub", kind="bg", size="1536x1024", prompt=(
        "An impossible dream corridor called the Hall of Doors, inside a house that has forgotten "
        f"how big it is. {BG_VIEW} "
        "A long warm hallway with far too many mismatched doors of different sizes, shapes and "
        "colours crowding both walls and even set into the ceiling, some doors upside down, faded "
        "striped wallpaper, worn floorboards with a threadbare runner rug down the middle, floating "
        "motes of dust catching the light, hanging paper lanterns. Dreamlike, cosy, endless, "
        f"gently uncanny. {STYLE}")),

    dict(name="bg_kitchen", kind="bg", size="1536x1024", prompt=(
        "An enormous cosy dream kitchen called the Kitchen That Hums, oversized as if seen by a "
        f"small child. {BG_VIEW} "
        "A huge friendly cast-iron stove on the back wall with a warm orange glow in its grate, "
        "copper pots and pans floating slowly in mid-air, a long scrubbed wooden table, jars of "
        "preserves on shelves, strings of dried herbs and paper recipe cards pegged on a line, "
        "checkered floor tiles worn soft at the edges, steam curling. Warm, buttery, comforting, "
        f"smells-like-baking feeling. {STYLE}")),

    dict(name="bg_garden", kind="bg", size="1536x1024", prompt=(
        "A half-flooded indoor greenhouse at night called the Drowned Garden. "
        f"{BG_VIEW} "
        "Shallow still water covering the tiled floor and reflecting everything perfectly, pale "
        "glowing water-lilies floating on the surface, overgrown ferns and drooping foxgloves in "
        "cracked terracotta pots, a broken glass roof open to an enormous starry night sky, an "
        "old brass watering can half-submerged, drifting green light. Beautiful, hushed, sad, "
        f"underwater-blue and lily-white. {STYLE}")),

    dict(name="bg_attic", kind="bg", size="1536x1024", prompt=(
        "A crowded dream attic called the Attic of Names. "
        f"{BG_VIEW} "
        "Stacks and stacks of cardboard boxes and old suitcases each with a blank paper luggage "
        "tag tied to it, hundreds of blank tags also hanging from the rafters on strings and "
        "turning slowly, a dressmaker's dummy under a dust sheet, a single small round window at "
        "the back letting in one dusty shaft of pale gold light, bare board floor. Still, dusty, "
        f"reverent, a place where things wait to be remembered. {STYLE}")),

    dict(name="bg_blank", kind="bg", size="1536x1024", prompt=(
        "An endless soft white emptiness called the Blank. "
        f"{BG_VIEW} "
        "Almost entirely blank warm off-white paper with no horizon line, and floating in it a few "
        "half-erased pencil-sketch objects that were never finished: the faint outline of a chair, "
        "half a doorway with no wall, a stair with three steps ending in nothing, scattered pale "
        "eraser crumbs and graphite smudges drifting like dust. Unsettling, gentle, lonely, almost "
        f"colourless with the faintest grey and cream. {STYLE}")),

    dict(name="bg_finalroom", kind="bg", size="1536x1024", prompt=(
        "A grandmother's small bedroom, remembered rather than real. "
        f"{BG_VIEW} "
        "A neatly made single bed with a lavender crocheted blanket, an empty wooden rocking chair "
        "beside it turned slightly as if just left, a bedside table with round wire glasses folded "
        "on a book, a window pouring impossible warm golden light that is far too bright and soft, "
        "dust in the air, faded floral wallpaper, a rag rug. Aching, tender, holy, warm gold and "
        f"lavender. {STYLE}")),

    dict(name="bg_title", kind="bg", size="1536x1024", prompt=(
        f"Title screen key art. {JUNE} stands small and alone in the lower right of a vast dark "
        f"navy emptiness, seen from behind and slightly to the side, holding up in both hands a "
        "glass paperweight the size of an apple with a tiny warm-lit house floating inside it. The "
        "paperweight casts the only light. "
        f"Beside her floats {WICK}. "
        "The whole upper half and upper left of the image is empty dark navy space with only a few "
        "drifting motes of light, deliberately left clear. Vast, quiet, hopeful and sad. "
        f"{STYLE}")),

    # ========================== BATTLE BACKGROUNDS ===========================
    dict(name="bb_hub", kind="bg", size="1536x1024", prompt=(
        f"{BATTLE_VIEW} Faded striped wallpaper in dusty rose and cream with worn floorboards "
        f"along the bottom, warm lamplight from off-frame, drifting dust motes. {STYLE}")),
    dict(name="bb_kitchen", kind="bg", size="1536x1024", prompt=(
        f"{BATTLE_VIEW} A warm kitchen: soft-focus checkered tiles along the bottom, hanging copper "
        f"pans and jars blurred in the background, buttery orange firelight, curling steam. {STYLE}")),
    dict(name="bb_garden", kind="bg", size="1536x1024", prompt=(
        f"{BATTLE_VIEW} A flooded night greenhouse: still black water with soft reflections along "
        f"the bottom, blurred ferns and glowing lilies, an enormous starry sky, drifting green and "
        f"lily-white light. {STYLE}")),
    dict(name="bb_attic", kind="bg", size="1536x1024", prompt=(
        f"{BATTLE_VIEW} A dusty attic: bare boards along the bottom, blurred stacked boxes and "
        f"hundreds of blank paper tags hanging on strings, one pale shaft of gold light, floating "
        f"dust. {STYLE}")),
    dict(name="bb_blank", kind="bg", size="1536x1024", prompt=(
        f"{BATTLE_VIEW} Almost entirely empty warm off-white paper with faint graphite smudges, a "
        f"few drifting eraser crumbs and one barely-visible half-erased pencil line. Nearly "
        f"colourless. {STYLE}")),

    # ============================== PORTRAITS ================================
    # 2x2 -> [neutral, smiling, sad, afraid]
    dict(name="por_june", kind="sheet", rows=2, cols=2, size="1024x1024", prompt=(
        f"Four head-and-shoulders bust portraits of the same character, {GRID2}. The character is "
        f"{JUNE}. Top-left panel: calm neutral expression looking forward. Top-right panel: a small "
        "shy warm smile, eyes softened. Bottom-left panel: downcast and sad, eyes lowered, mouth "
        "small and unhappy. Bottom-right panel: frightened, eyes very wide, shoulders drawn up. "
        f"Each panel {MAGENTA} except for the thin white grid lines. {STYLE}")),

    dict(name="por_dell", kind="sheet", rows=2, cols=2, size="1024x1024", prompt=(
        f"Four head-and-shoulders bust portraits of the same character, {GRID2}. The character is "
        f"{DELL}. Top-left panel: cheerful neutral, eyebrows up. Top-right panel: huge delighted "
        "open-mouthed grin. Bottom-left panel: crestfallen, looking down and away, mouth wobbling. "
        "Bottom-right panel: furious and hurt, teeth bared, eyes stinging with tears. "
        f"Each panel {MAGENTA} except for the thin white grid lines. {STYLE}")),

    dict(name="por_hal", kind="sheet", rows=2, cols=2, size="1024x1024", prompt=(
        f"Four head-and-shoulders bust portraits of the same character, {GRID2}. The character is "
        f"{HAL}. Top-left panel: flat unreadable expression. Top-right panel: one corner of the "
        "mouth lifted in a dry half-smile, eyes warmer. Bottom-left panel: eyes closed, face "
        "carefully blank, hurting quietly. Bottom-right panel: sharp and defensive, chin lifted, "
        f"glaring sideways. Each panel {MAGENTA} except for the thin white grid lines. {STYLE}")),

    dict(name="por_wick", kind="sheet", rows=2, cols=2, size="1024x1024", prompt=(
        f"Four portraits of the same small creature, {GRID2}. The creature is {WICK}. Top-left "
        "panel: flame calm and steady, wings resting. Bottom-right is not a face so the emotion is "
        "shown by the flame and wings. Top-right panel: flame bright and tall and cheerful, wings "
        "spread wide, sparkles. Bottom-left panel: flame guttering low and small and blue-ish, "
        "wings drooping, tiny eyes downturned. Bottom-right panel: flame flickering wildly and "
        "leaning as if in wind, wings clamped down, eyes wide. "
        f"Each panel {MAGENTA} except for the thin white grid lines. {STYLE}")),

    dict(name="por_nel", kind="sheet", rows=2, cols=2, size="1024x1024", prompt=(
        f"Four head-and-shoulders bust portraits of the same character, {GRID2}. The character is "
        f"{NEL}. Top-left panel: gentle neutral, warm and present. Top-right panel: laughing "
        "delightedly with her eyes shut. Bottom-left panel: confused and lost, searching, mouth "
        "slightly open, eyes unfocused and frightened of not knowing. Bottom-right panel: eyes "
        "closed, utterly peaceful, faintly smiling. "
        f"Each panel {MAGENTA} except for the thin white grid lines. {STYLE}")),

    # ============================ WALK SPRITES ===============================
    # 2x2 -> [front(down), back(up), left, right]
    dict(name="spr_june", kind="sheet", rows=2, cols=2, size="1024x1024", prompt=(
        f"Four full-body standing views of the same character, {GRID2}. The character is {JUNE}, "
        "drawn small and simple with a slightly large head, like a walking sprite for a 2D "
        "role-playing game, standing straight with arms at her sides, whole body from the newspaper "
        "crown down to the boots visible with clear space above and below. Top-left panel: facing "
        "the viewer straight on. Top-right panel: seen directly from behind, facing away. "
        "Bottom-left panel: strict side view facing left. Bottom-right panel: strict side view "
        f"facing right. Each panel {MAGENTA} except for the thin white grid lines. {STYLE}")),

    dict(name="spr_dell", kind="sheet", rows=2, cols=2, size="1024x1024", prompt=(
        f"Four full-body standing views of the same character, {GRID2}. The character is {DELL}, "
        "drawn small and simple with a slightly large head, like a walking sprite for a 2D "
        "role-playing game, standing straight holding his little lantern stick, whole body visible "
        "with clear space above and below. Top-left panel: facing the viewer straight on. Top-right "
        "panel: seen directly from behind, facing away. Bottom-left panel: strict side view facing "
        f"left. Bottom-right panel: strict side view facing right. Each panel {MAGENTA} except for "
        f"the thin white grid lines. {STYLE}")),

    dict(name="spr_hal", kind="sheet", rows=2, cols=2, size="1024x1024", prompt=(
        f"Four full-body standing views of the same character, {GRID2}. The character is {HAL}, "
        "drawn small and simple with a slightly large head, like a walking sprite for a 2D "
        "role-playing game, standing straight with hands in her cardigan sleeves, whole body "
        "visible with clear space above and below. Top-left panel: facing the viewer straight on. "
        "Top-right panel: seen directly from behind, facing away. Bottom-left panel: strict side "
        "view facing left. Bottom-right panel: strict side view facing right. "
        f"Each panel {MAGENTA} except for the thin white grid lines. {STYLE}")),

    dict(name="spr_wick", kind="sheet", rows=2, cols=2, size="1024x1024", prompt=(
        f"Four full views of the same small floating creature, {GRID2}. The creature is {WICK}, "
        "drawn small and simple like a floating sprite for a 2D role-playing game, whole creature "
        "visible with clear space around it. Top-left panel: facing the viewer straight on with "
        "wings spread. Top-right panel: seen directly from behind, facing away, wings spread. "
        "Bottom-left panel: strict side view facing left. Bottom-right panel: strict side view "
        f"facing right. Each panel {MAGENTA} except for the thin white grid lines. {STYLE}")),

    # =============================== ENEMIES =================================
    dict(name="en_dustling", kind="cutout", size="1024x1024", prompt=(
        "A DUSTLING: a soft grey ball of house-dust and lint the size of a cat, with two sleepy "
        "half-closed eyes, a tiny yawning mouth, and four little tufty legs, trailing wisps of "
        f"fluff. Harmless and drowsy and rather sweet. {MAGENTA} {STYLE}")),

    dict(name="en_chippedcup", kind="cutout", size="1024x1024", prompt=(
        "A CHIPPED CUP: a small floral porcelain teacup with a large chip missing from its rim, "
        "standing on two thin bird-like legs, with a sorrowful little face on the side of the cup "
        f"and cold tea spilling out of it like tears. Pitiable and sweet. {MAGENTA} {STYLE}")),

    dict(name="en_emptycoat", kind="cutout", size="1024x1024", prompt=(
        "An EMPTY COAT: a long brown wool overcoat floating upright with nobody inside it, hollow "
        "black darkness at the collar and cuffs, sleeves held out wide as if asking for a hug, a "
        f"single wooden button hanging by a thread. Lonely and quietly frightening. {MAGENTA} {STYLE}")),

    dict(name="en_hourmoth", kind="cutout", size="1024x1024", prompt=(
        "An HOUR MOTH: a large soft pale moth whose two wings are each a worn clock face with bent "
        "hands pointing the wrong way, furry cream body, feathery antennae, faint trailing dust of "
        f"tiny numbers. Beautiful and melancholy. {MAGENTA} {STYLE}")),

    dict(name="en_mitten", kind="cutout", size="1024x1024", prompt=(
        "A MITTEN: a hand-knitted red woollen mitten worn like a hungry puppet, its cuff opened "
        "into a wide grinning mouth full of far too many small white teeth, two mismatched button "
        f"eyes sewn on crookedly, loose yarn unravelling from one side. Cute and wrong. {MAGENTA} {STYLE}")),

    dict(name="en_sorrowvine", kind="cutout", size="1024x1024", prompt=(
        "A SORROWVINE: a tall drooping foxglove-like flower on a curved stem, its bell-shaped bloom "
        "hanging down like a bowed head with a small weeping face inside it, wet leaves, a puddle of "
        f"water gathering below. Gentle and inconsolable. {MAGENTA} {STYLE}")),

    dict(name="en_staticchild", kind="cutout", size="1024x1024", prompt=(
        "A STATIC CHILD: the silhouette of a small child standing very still, but the whole figure "
        "is filled with grey and white television static and smeared pencil, edges fraying into "
        f"noise, no face at all, hands hanging at its sides. Deeply unsettling but small. {MAGENTA} {STYLE}")),

    dict(name="en_pilotlight", kind="cutout", size="1024x1024", prompt=(
        "PILOT LIGHT, a boss creature: an enormous old cast-iron kitchen stove come to life, its "
        "open grate a scowling mouth full of orange fire, two round iron hotplates for glaring eyes, "
        "stubby clawed legs, a hot kettle balanced on top like a hat, smoke snorting from its flue. "
        f"Big, grumpy, warm-hearted. {MAGENTA} {STYLE}")),

    dict(name="en_drownedlily", kind="cutout", size="1024x1024", prompt=(
        "THE DROWNED LILY, a boss creature: an enormous pale water-lily blossom the size of a bed, "
        "petals opening around a calm sleeping girl's face made entirely of clear water, long "
        "trailing roots hanging beneath it like hair, faint green glow, water running endlessly off "
        f"the petals. Serene, sorrowful, beautiful, frightening. {MAGENTA} {STYLE}")),

    dict(name="en_nameless", kind="cutout", size="1024x1024", prompt=(
        "THE NAMELESS, a boss creature: a tall thin soft figure of a person made entirely of "
        "half-erased pencil and blank white paper, no face whatsoever, one long arm ending in a "
        "worn pink rubber eraser instead of a hand, its lower half fading into nothing and shedding "
        f"eraser crumbs. Quiet, patient, terrifyingly gentle. {MAGENTA} {STYLE}")),

    dict(name="en_thehouse", kind="cutout", size="1024x1024", prompt=(
        "THE HOUSE THAT FORGETS, a final boss creature: a hunched giant shaped roughly like an old "
        "house folded into a sitting figure, walls for shoulders, two lit windows for kind tired "
        "eyes, a front door for a mouth standing slightly open, wallpaper peeling off it like skin, "
        "doors and picture frames scattered across its body, staircases for arms, the whole thing "
        f"slowly coming apart into blank white paper at the edges. Enormous, sad, loving. {MAGENTA} {STYLE}")),

    # ============================== UI / ITEMS ===============================
    dict(name="ui_items", kind="sheet", rows=4, cols=4, size="1024x1024", prompt=(
        "Sixteen small object icons arranged as a clean 4 by 4 grid of sixteen equal square panels "
        "separated by thin pure white dividing lines, one object centred in each panel, all drawn "
        "at a similar size. Row 1: a jar of strawberry jam with a cloth lid; a small square "
        "photograph, face down; a wooden spool of red thread; a fabric plaster bandage. "
        "Row 2: a glass marble with a blue swirl; a small brass key; a pressed dried violet between "
        "two panes of glass; a tiny wind-up music box, open. Row 3: a chipped porcelain thimble; a "
        "paper crane; a stub of yellow pencil; a soft grey knitted sock. Row 4: a boiled sweet in a "
        "twisted wrapper; a folded paper crown; a tarnished silver locket, closed; a glass "
        "paperweight with a tiny house inside it. "
        f"Each panel {MAGENTA} except for the thin white grid lines. {STYLE}")),

    dict(name="ui_moods", kind="sheet", rows=2, cols=2, size="1024x1024", prompt=(
        "Four simple emblem symbols arranged as a clean 2 by 2 grid of four equal square panels "
        "separated by thin pure white dividing lines, one bold simple emblem centred in each panel, "
        "drawn like a soft chalk-and-pencil badge, each strongly one colour. Top-left: STEADY, a "
        "calm level horizon line inside a circle, warm cream and soft gold. Top-right: TENDER, a "
        "small heart cupped inside two open hands, dusty rose and pink. Bottom-left: FRAYED, a "
        "jagged snapped thread with the ends unravelling, hot brick red and orange. Bottom-right: "
        "DISTANT, a tiny closed door far away at the end of a fading tunnel, cold slate blue and "
        f"pale grey. Each panel {MAGENTA} except for the thin white grid lines. {STYLE}")),

    dict(name="ui_paperweight", kind="cutout", size="1024x1024", prompt=(
        "A single beautiful object: a heavy round glass paperweight the size of an apple, perfectly "
        "clear, with a tiny warmly-lit house and one small tree suspended inside it, and a slow "
        "drift of gold flecks around them like snow. It glows softly from within and casts light. "
        f"{MAGENTA} {STYLE}")),
]

BY_NAME = {a["name"]: a for a in ASSETS}

if __name__ == "__main__":
    import collections
    c = collections.Counter(a["kind"] for a in ASSETS)
    print(f"{len(ASSETS)} generations: {dict(c)}")
