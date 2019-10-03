const { Client, Team, BoxScore} = require('espn-fantasy-football-api/node-dev');

const myClient = new Client({ leagueId: 564127 });
const myEspns2 = 'AEAhcHpaQrwFj9PFxcPnkBzat3IbrqJuKYi%2B4UseqG5zZ8NnyYYa2WTURjO2LGwpK2nUnk8VJLQlpW6y8dNPgmjjfxuarOLRP%2B5z0diP0Zh%2B3PlnjTV3ooDsqwkUs7DDngkNWZpp2cl%2BrrrHETkYX3a9SVLX2AUoui6GABkDaKkh78f9pd5XJ0rFpwEtN%2BrDR%2FMRGQD%2FbLPs2UcaofWglevjwpV9t1wUms%2BdEPpe1m3COkIqIfVvM5JWR5CTIM63iWY%3D'
const mySWID = '{2690D5F2-9AD4-4259-90D5-F29AD4525943}'
const seasonYear = 2019;
const leagueId = 564127;
const current_week = 1;
myClient.setCookies({ espnS2: myEspns2, SWID: mySWID });

myClient.getTeamsAtWeek({ seasonId: seasonYear, scoringPeriodId: current_week }).then((teams) => {
    teams.forEach( (team) => {
        team.cache;
        // console.log(team.name, team.getCacheId());
    });
    // console.log("============================================");
}).then(
    myClient.getBoxscoreForWeek({ seasonId: seasonYear, scoringPeriodId: current_week, matchupPeriodId: current_week }).then((boxscores) => {
        boxscores.forEach( (boxscore) => {
            if (boxscore.homeTeamId != 0 ) {
                getCachedTeams(boxscore, printMatchup);
                const homeOptimalRoster = maxTeamScore(boxscore.homeRoster)
                const awayOptimalRoster = maxTeamScore(boxscore.awayRoster)

                // console.log(optimalRoster);
                console.log("Actual Score:        " + boxscore.homeScore + ' - ' + boxscore.awayScore);
                console.log("Max Possible Scores: " + sumStarters(homeOptimalRoster) + ' - ' + sumStarters(awayOptimalRoster) + "\n");
            }
        });
        // console.log("============================================");
    }).catch( (error) => console.error(error.Error)));

function getCachedTeams(boxscore, callback) {
    homeTeam = Team.get(`id=${boxscore.homeTeamId};leagueId=${leagueId};seasonId=${seasonYear};`);
    awayTeam = Team.get(`id=${boxscore.awayTeamId};leagueId=${leagueId};seasonId=${seasonYear};`);
    // if (!homeTeam && !awayTeam) console.log(Team.cache);
    callback(homeTeam, awayTeam, boxscore);
}

function printMatchup(homeTeam, awayTeam, boxscore) {
    console.log(`${homeTeam.name} vs. ${awayTeam.name}`);
}
function printScores(homeTeam, awayTeam, boxscore) {
    let oldHomeScore = roundStarters(boxscore.homeRoster);
    let oldAwayScore = roundStarters(boxscore.awayRoster);
    if (checkForResultVariant(oldHomeScore, oldAwayScore, boxscore)) {
        const result = getMatchupResult(oldHomeScore, oldAwayScore);
        console.log(`${result == 1 ? 'Home Win' : (result == -1 ? 'Away win' : 'TIE AHAHAHAH')} 2018 Score: ${homeTeam.abbreviation}: ${oldHomeScore}--${oldAwayScore} :${awayTeam.abbreviation}`);
    }
    console.log(`2019 Score: ${homeTeam.abbreviation}: ${boxscore.homeScore}--${boxscore.awayScore} :${awayTeam.abbreviation}`);  
}
// takes in array of BoxscorePlayers
// returns summation of each player's rounded score (according to 2018 scoring rules)
function roundStarters(roster) {
    let roundedTotal = 0;
    roster.forEach( (player) => {
        if (player.position != 'Bench') {
            roundedTotal += roundPlayerScore(player);
        }
    });
    return roundedTotal
}

// takes in BoxscorePlayer
function roundPlayerScore(player) {
    const baseScore = player.totalPoints;
    const ptBreakdown = player.pointBreakdown;
    let roundedBreakdown = 0;
    let summedBreakdown = 0;
    for (let prop in ptBreakdown) {
        let val = ptBreakdown[prop];
        if (typeof val == 'number') {
            roundedBreakdown += Math.floor(val);
            summedBreakdown += val;
        }
    }
    roundedScore = Math.floor(baseScore - summedBreakdown) + roundedBreakdown;
    return roundedScore;
}
// returns 1:homeWin, 0:tie, -1:awayWin
function getMatchupResult(homeScore, awayScore) {
    return homeScore > awayScore ? 1 : (homeScore < awayScore ? -1 : 0);
}
// takes in a cached homeTeam/awayTeam boxscore, compares 2019 score with 2018 score
// returns true/false if the result (W/L/T) differs from 2019-2018
function checkForResultVariant(oldHomeScore, oldAwayScore, boxscore) {
    const matchResult = getMatchupResult(boxscore.homeScore, boxscore.awayScore);
    return (matchResult !== getMatchupResult(oldHomeScore, oldAwayScore));
}

function sumStarters(roster) {
    let sum = 0;
    for (i in roster) {
        const position = roster[i];
        position.forEach( (player) => sum += player.totalPoints);
    }
    return sum;
}

function sortRosterByScore(roster) {
    let sorted = [];
    roster.forEach( (slot) => {
        let rosterPlayer = {
            'name': slot.player.fullName, 
            'pos': slot.player.defaultPosition,
            'totalPoints': slot.totalPoints
        }
        sorted.push(rosterPlayer);
    });
    return sorted.sort((a,b) => a.totalPoints < b.totalPoints ? 1 : -1);
}
function maxTeamScore(roster) {
    let maxRoster = {
        'TQB': [],   // TQB
        'RB':[],    // RB
        'RB/WR':[],    // WR
        'WR':[],    // TE
        'FLEX':[],  // [RB/WR, RB, WR]
        'WR/TE':[],     // K
        'D/ST':[]   // D/ST
    };
    let activeRosterSize = 0;
    let rosterByScore = sortRosterByScore(roster);
    for (i in rosterByScore) {
        let player = rosterByScore[i];
        if (activeRosterSize == 9) break;
        if ((player.pos == 'RB/WR' || player.pos == 'RB') && maxRoster[player.pos].length < 2) { // max limit === 2
            maxRoster[player.pos].push(player);
            activeRosterSize++;
        }
        else if (maxRoster[player.pos].length < 1) {
            maxRoster[player.pos].push(player);
            activeRosterSize++;
        }
        else if ((player.pos == 'RB/WR' || player.pos == 'RB' || player.pos == 'WR') && maxRoster.FLEX.length < 1) {
            maxRoster.FLEX.push(player);
            activeRosterSize++;
        }
    }
    return maxRoster;
}