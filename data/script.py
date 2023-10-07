import json

# Charger le fichier JSON
with open('foxhole-db.json', 'r') as fichier:
    data = json.load(fichier)

# Liste des clés à supprimer
cles_a_supprimer = [
    "displayId",
    "imgName",
    "itemClass",
    "ammoUsed",
    "numberProduced",
    "isTeched",
    "isMpfCraftable",
    "cost",
    "damageType",
    "outfitBuffs"
]

# Parcourir la liste des objets dans le JSON et supprimer les clés indésirables
for objet in data:
    for cle in cles_a_supprimer:
        if cle in objet:
            del objet[cle]

# Enregistrer le fichier JSON modifié
with open('fox.json', 'w') as fichier:
    json.dump(data, fichier, indent=2)
