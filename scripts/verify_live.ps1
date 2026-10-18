$root = Invoke-WebRequest -Uri 'https://snapedge.mohalex.workers.dev/' -UseBasicParsing
Write-Host "ROOT_STATUS=$($root.StatusCode)"

$api = Invoke-RestMethod -Uri 'https://snapedge.mohalex.workers.dev/api/slate?league=NFL' -UseBasicParsing
Write-Host "API_STATUS=$($api.status)"
Write-Host "LEAGUE=$($api.league)"
Write-Host "TOTAL_GAMES=$($api.totalGames)"
Write-Host "SAMPLE_GAME=$($api.matchups[0].awayTeam.name) at $($api.matchups[0].homeTeam.name)"
Write-Host "SAMPLE_TOTAL=$($api.matchups[0].market.total)"
Write-Host "SAMPLE_SPREAD=$($api.matchups[0].market.spread)"
