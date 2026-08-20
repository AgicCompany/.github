<#
.SYNOPSIS
  Crea un nuovo GitHub Project clonando il template org (incluse VISTE, campi, configurazione).

.DESCRIZIONE
  Usa la mutation GraphQL copyProjectV2: a differenza della funzione "Use as template" della UI,
  e' eseguibile da riga di comando in modo ripetibile. Clona dal Project template tutte le viste,
  i campi custom, le opzioni dello Status e i workflow.

  IMPORTANTE (limite GitHub): la copia e' una FOTOGRAFIA al momento della creazione.
  Modifiche successive al template NON si propagano ai progetti gia' creati (le viste non sono
  aggiornabili via API). Quindi: stabilizza il template, poi crea i progetti con questo script.

.PARAMETRO Title
  Titolo del nuovo progetto (es. "agic-clienteX-progetto").

.PARAMETRO Method
  (Opzionale) metodo del progetto: "scrum" (default, template #8) o "kanban" (template #9).

.PARAMETRO RepoToLink
  (Opzionale) owner/repo da agganciare automaticamente al nuovo progetto.

.PARAMETRO IncludeDraftIssues
  (Opzionale) se presente, copia anche le draft issue del template.

.PARAMETRO CreateRepo
  (Opzionale) se presente, crea la repo indicata in -RepoToLink quando non esiste ancora.

.PARAMETRO RepoVisibility
  (Opzionale) visibilita della repo creata con -CreateRepo: private (default), public o internal.

.PARAMETRO SkipSetup
  (Opzionale) salta lo step finale di setup del campo Alert / sezione automazioni sul progetto.

.ESEMPIO
  ./new-project-from-template.ps1 -Title "agic-acme-shop" -RepoToLink "AgicCompany/acme-project"

.ESEMPIO
  ./new-project-from-template.ps1 -Title "agic-acme-flow" -Method kanban

.ESEMPIO
  # Self-service in un solo passo: crea progetto + crea la repo + esegue il setup Alert
  ./new-project-from-template.ps1 -Title "agic-acme-shop" -RepoToLink "AgicCompany/acme-project" -CreateRepo
#>
param(
  [Parameter(Mandatory=$true)][string]$Title,
  [ValidateSet('scrum','kanban')][string]$Method = 'scrum',
  [string]$RepoToLink,
  [switch]$IncludeDraftIssues,
  [switch]$CreateRepo,
  [ValidateSet('private','public','internal')][string]$RepoVisibility = 'private',
  [switch]$SkipSetup
)
$ErrorActionPreference = "Stop"

# --- Preflight: verifica prerequisiti prima di toccare l'org ---
function Invoke-Preflight {
  if(-not (Get-Command gh -ErrorAction SilentlyContinue)){
    Write-Error "GitHub CLI 'gh' non trovato. Installalo da https://cli.github.com/ e riprova."; exit 1
  }
  gh auth status 1>$null 2>$null
  if($LASTEXITCODE -ne 0){
    Write-Error "Non risulti autenticato con gh. Esegui: gh auth login"; exit 1
  }
  # Verifica scope 'project' (necessario per creare/clonare i Project org).
  $scopesLine = (gh auth status 2>&1 | Select-String 'Token scopes')
  if($scopesLine -and ($scopesLine.ToString() -notmatch 'project')){
    Write-Error "Il token gh non ha lo scope 'project'. Esegui: gh auth refresh -s project -s read:org -s repo"; exit 1
  }
  if((-not $SkipSetup) -and (-not (Get-Command node -ErrorAction SilentlyContinue))){
    Write-Error "Node.js non trovato (serve per il setup Alert). Installa Node 20, oppure rilancia con -SkipSetup."; exit 1
  }
}
Invoke-Preflight

# --- Config template (Project dell'org, marcati come template) ---
# scrum  = #8  agic_scrum_template  (viste sprint, Story Points, Iteration)
# kanban = #9  agic_kanban_template (viste di flusso, no Story Points/Iteration)
$ORG_LOGIN     = "AgicCompany"
$OWNER_ID      = "O_kgDODysZfA"             # node id org AgicCompany
$TEMPLATE_PIDS = @{
  scrum  = "PVT_kwDODysZfM4BdR2i"          # node id Project #8 (agic_scrum_template)
  kanban = "PVT_kwDODysZfM4BdR2j"          # node id Project #9 (agic_kanban_template)
}
$TEMPLATE_PID  = $TEMPLATE_PIDS[$Method]

Write-Host "Clono il template [$Method] '$TEMPLATE_PID' -> nuovo progetto '$Title'..."

$drafts = if($IncludeDraftIssues){ "true" } else { "false" }
$q = @"
mutation(`$src:ID!, `$owner:ID!, `$title:String!) {
  copyProjectV2(input:{ projectId:`$src, ownerId:`$owner, title:`$title, includeDraftIssues:$drafts }) {
    projectV2 { id number url title }
  }
}
"@

$res = gh api graphql -f query=$q -f "src=$TEMPLATE_PID" -f "owner=$OWNER_ID" -f "title=$Title" | ConvertFrom-Json
$p = $res.data.copyProjectV2.projectV2
if(-not $p){ Write-Error "Copia fallita."; exit 1 }
Write-Host "OK -> #$($p.number)  $($p.url)"

# --- Creazione repo opzionale (self-service) ---
if($CreateRepo){
  if(-not $RepoToLink){ Write-Error "-CreateRepo richiede -RepoToLink 'owner/repo'."; exit 1 }
  gh api "repos/$RepoToLink" 1>$null 2>$null
  if($LASTEXITCODE -eq 0){
    Write-Host "Repo '$RepoToLink' gia esistente: la riuso."
  } else {
    Write-Host "Creo la repo '$RepoToLink' ($RepoVisibility)..."
    gh repo create $RepoToLink "--$RepoVisibility" --add-readme | Out-Null
    if($LASTEXITCODE -ne 0){ Write-Error "Creazione repo fallita."; exit 1 }
  }
}

# --- Aggancio repo opzionale ---
if($RepoToLink){
  $repoId = gh api "repos/$RepoToLink" --jq '.node_id'
  $ql = 'mutation($p:ID!,$r:ID!){ linkProjectV2ToRepository(input:{projectId:$p, repositoryId:$r}){ repository{ name } } }'
  gh api graphql -f query=$ql -f "p=$($p.id)" -f "r=$repoId" | Out-Null
  Write-Host "Repo '$RepoToLink' agganciata al progetto."
}

# --- Setup automazioni Alert sul nuovo progetto (idempotente) ---
if(-not $SkipSetup){
  $setupScript = Join-Path $PSScriptRoot '..' 'scripts' 'project-alerts.mjs'
  if(Test-Path $setupScript){
    Write-Host "Eseguo il setup del campo Alert e della sezione automazioni sul progetto #$($p.number)..."
    $prevToken = $env:GITHUB_TOKEN; $prevOwner = $env:PROJECT_OWNER; $prevNum = $env:PROJECT_NUMBER
    try {
      $env:GITHUB_TOKEN   = gh auth token
      $env:PROJECT_OWNER  = $ORG_LOGIN
      $env:PROJECT_NUMBER = "$($p.number)"
      node $setupScript setup
      if($LASTEXITCODE -ne 0){ Write-Warning "Setup Alert terminato con errori: verifica manualmente il progetto." }
    } finally {
      $env:GITHUB_TOKEN = $prevToken; $env:PROJECT_OWNER = $prevOwner; $env:PROJECT_NUMBER = $prevNum
    }
  } else {
    Write-Warning "Script setup non trovato ($setupScript): salto il setup Alert."
  }
}

Write-Host "`nNuovo progetto pronto: $($p.url)"
