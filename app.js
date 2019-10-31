const { Client, Team, BoxScore} = require('espn-fantasy-football-api/node-dev');

const myClient = new Client({ leagueId: 564127 });
const myEspns2 = 'AEAhcHpaQrwFj9PFxcPnkBzat3IbrqJuKYi%2B4UseqG5zZ8NnyYYa2WTURjO2LGwpK2nUnk8VJLQlpW6y8dNPgmjjfxuarOLRP%2B5z0diP0Zh%2B3PlnjTV3ooDsqwkUs7DDngkNWZpp2cl%2BrrrHETkYX3a9SVLX2AUoui6GABkDaKkh78f9pd5XJ0rFpwEtN%2BrDR%2FMRGQD%2FbLPs2UcaofWglevjwpV9t1wUms%2BdEPpe1m3COkIqIfVvM5JWR5CTIM63iWY%3D'
const mySWID = '{2690D5F2-9AD4-4259-90D5-F29AD4525943}'
const seasonYear = 2019;
const leagueId = 564127;
const current_week = 8;
myClient.setCookies({ espnS2: myEspns2, SWID: mySWID });

main();
// tryingAsync();
async function tryingAsync() {
    let simulatedWeek = await simulateWeek(current_week);
    console.log(simulatedWeek);
}

// current method of making API call EACH WEEK via getBoxScoreforWeek TOO MUCH/slow, need just 1 API call... see below
//make a axios.get HTTP call to "http://fantasy.espn.com/apis/v3/games/ffl/seasons/2019/segments/0/leagues/564127?&view=mMatchupScore&view=modular"
// "schedule" is the field that has al lof the matchups
// look for already played weeks... where "winner" != "UNDECIDED"
// 
async function getWeekAvgScore(week) {
    let boxscores  = await myClient.getBoxscoreForWeek({ seasonId: seasonYear, scoringPeriodId: current_week, matchupPeriodId: current_week });
    let sumScores = 0;
    let numTeams = 0;
    boxscores.forEach(matchup => {
        sumScores += matchup.homeScore + matchup.awayScore;
        numTeams += 2;
    });

    return await Math.round(sumScores / numTeams, 2);

}
async function main() {
    class simTeam {
        constructor(id, name, abbreviation) {
            this.id = id;
            this.name = name;
            this.abbreviation = abbreviation;
            this.totalPoints = 0;
            this.wins = 0;
            this.ties = 0;
            this.losses = 0;
        }
    }
    simulatedTeams = {};
    const teams = await myClient.getTeamsAtWeek({ seasonId: seasonYear, scoringPeriodId: current_week })
    teams.forEach( (team) => {
        team.cache;
        let tempTeam = new simTeam(team.id, team.name, team.abbreviation);
        simulatedTeams[team.id] = tempTeam;
    });
    // console.log(simulatedTeams);
    for (let i=1; i <= current_week; i++) {
        let xWeekScores =  await simulateWeek(i);
        xWeekScores.forEach(team => {
            simulatedTeams[team.teamId].wins += team.wins;
            simulatedTeams[team.teamId].ties += team.ties;
            simulatedTeams[team.teamId].losses += team.losses;
            simulatedTeams[team.teamId].totalPoints += team.score;
        });
    }
    // console.log(simulatedTeams);
    Object.keys(simulatedTeams).forEach( (id) => {
        console.log(`${simulatedTeams[id].name}: ${simulatedTeams[id].wins}-${simulatedTeams[id].ties}-${simulatedTeams[id].losses}`);
    });
        // myClient.getBoxscoreForWeek({ seasonId: seasonYear, scoringPeriodId: current_week, matchupPeriodId: current_week }).then((boxscores) => {
        //    console.log(`=================== Week ${current_week} Scores ===================`);
        //     boxscores.forEach( (boxscore) => {
        //         if (boxscore.homeTeamId != 0 ) {
        //             getCachedTeams(boxscore, printMatchup);
        //             const homeOptimalRoster = maxTeamScore(boxscore.homeRoster)
        //             const awayOptimalRoster = maxTeamScore(boxscore.awayRoster)

        //             // console.log(optimalRoster);
        //             console.log("Actual Score:        " + boxscore.homeScore + ' - ' + boxscore.awayScore);
        //             console.log("Max Possible Scores: " + sumStarters(homeOptimalRoster) + ' - ' + sumStarters(awayOptimalRoster) + "\n");
        //             // getCachedTeams(boxscore, printScores);
        //             // console.log("\n");

        //         }
        //     });
        //     // console.log("============================================");
        // }).catch( (error) => console.error(error.Error)));
    }

function getCachedTeams(boxscore, callback) {
    homeTeam = Team.get(`id=${boxscore.homeTeamId};leagueId=${leagueId};seasonId=${seasonYear};`);
    awayTeam = Team.get(`id=${boxscore.awayTeamId};leagueId=${leagueId};seasonId=${seasonYear};`);
    // if (!homeTeam && !awayTeam) console.log(Team.cache);
    callback(homeTeam, awayTeam, boxscore);
}

function printMatchup(homeTeam, awayTeam, boxscore) {
    console.log(`===== ${homeTeam.name} vs. ${awayTeam.name} =====`);
}
function printScores(homeTeam, awayTeam, boxscore) {
    let oldHomeScore = roundStarters(boxscore.homeRoster);
    let oldAwayScore = roundStarters(boxscore.awayRoster);
    if (checkForResultVariant(oldHomeScore, oldAwayScore, boxscore)) {
        const result = getMatchupResult(oldHomeScore, oldAwayScore);
        console.log(`${result == 1 ? 'Home Win' : (result == -1 ? 'Away win' : 'TIE AHAHAHAH')} 2018 Score: ${homeTeam.abbreviation}: ${oldHomeScore}--${oldAwayScore} :${awayTeam.abbreviation}`);
    }
    console.log(`2018 Score: ${homeTeam.abbreviation}: ${oldHomeScore}--${oldAwayScore} :${awayTeam.abbreviation}`);

    // console.log(`2019 Score: ${homeTeam.abbreviation}: ${boxscore.homeScore}--${boxscore.awayScore} :${awayTeam.abbreviation}`);  
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
    return sum.toFixed(1);
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
        'TQB': [],   // QB
        'RB': [],    // RB
        'RB/WR': [],    // WR
        'WR': [],    // TE
        'FLEX': [],  // [RB/WR, RB, WR]
        'WR/TE': [],     // K
        'D/ST': []   // D/ST
    };
    let activeRosterSize = 0;
    let rosterByScore = sortRosterByScore(roster);
    for (i in rosterByScore) {
        let player = rosterByScore[i];
        // check if roster full
        if (activeRosterSize == 9) break;
        //RBs and WRs
        if ((player.pos == 'RB/WR' || player.pos == 'RB') && maxRoster[player.pos].length < 2) { // max limit === 2
            maxRoster[player.pos].push(player);
            activeRosterSize++;
        }
        // no FLEX-able positions
        else if (maxRoster[player.pos].length < 1) {
            maxRoster[player.pos].push(player);
            activeRosterSize++;
        }
        // FLEX
        else if ((player.pos == 'RB/WR' || player.pos == 'RB' || player.pos == 'WR') && maxRoster.FLEX.length < 1) {
            maxRoster.FLEX.push(player);
            activeRosterSize++;
        }
    }
    return maxRoster;
}

async function simulateWeek(week){
    // cache all teams in league
    // for each week from 1 - n
    // sort week's scores, in object ({cached team: score for week i},...)
    // for each team in week, find team in sorted array, calculate their summed record on the week by their position in Array
    let weekScores = []; // [{teamId:n,score:n}]
    let boxscores = await myClient.getBoxscoreForWeek({ seasonId: seasonYear, scoringPeriodId: week, matchupPeriodId: week });
    boxscores.forEach((boxscore) => {
        weekScores.push({teamId: boxscore.homeTeamId, score: boxscore.homeScore});
        weekScores.push({teamId: boxscore.awayTeamId, score: boxscore.awayScore});
        // console.log(boxscore.homeScore, boxscore.awayScore);
    });
    weekScores.sort((a,b) => a.score < b.score ? 1 : -1)
        // weekScores = [ { teamId: 2, score: 176.4 },
        //     { teamId: 10, score: 158.4 },
        //     { teamId: 12, score: 147 },
        //     { teamId: 8, score: 128.9 },
        //     { teamId: 16, score: 128.9 },
        //     { teamId: 3, score: 128.9 },
        //     { teamId: 4, score: 115.9 },
        //     { teamId: 13, score: 111.7 },
        //     { teamId: 14, score: 97.7 },
        //     { teamId: 9, score: 91.7 },
        //     { teamId: 5, score: 88.7 },
        //     { teamId: 1, score: 87.9 },
        //     { teamId: 7, score: 86.7 },
        //     { teamId: 6, score: 78.4 } ];
    for (let i=0;i<weekScores.length;i++) {
        let fOffset = 1;
        let bOffset = 1;
        while (i + fOffset < weekScores.length && weekScores[i + fOffset].score == weekScores[i].score) {
            fOffset++;
        }
        while (i - bOffset >= 0 && weekScores[i - bOffset].score == weekScores[i].score) {
            bOffset++;
        }
        weekScores[i].wins = weekScores.length - i - 1 - (fOffset - 1);
        weekScores[i].losses = i - (bOffset - 1);
        weekScores[i].ties = weekScores.length - 1 - weekScores[i].wins - weekScores[i].losses;
    }
    // 
    return weekScores;
}
