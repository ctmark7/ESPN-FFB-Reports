const { Client, Team, BoxScore} = require('espn-fantasy-football-api/node-dev');
const axios = require('axios');
const myClient = new Client({ leagueId: 564127 });
const myEspns2 = 'AEAhcHpaQrwFj9PFxcPnkBzat3IbrqJuKYi%2B4UseqG5zZ8NnyYYa2WTURjO2LGwpK2nUnk8VJLQlpW6y8dNPgmjjfxuarOLRP%2B5z0diP0Zh%2B3PlnjTV3ooDsqwkUs7DDngkNWZpp2cl%2BrrrHETkYX3a9SVLX2AUoui6GABkDaKkh78f9pd5XJ0rFpwEtN%2BrDR%2FMRGQD%2FbLPs2UcaofWglevjwpV9t1wUms%2BdEPpe1m3COkIqIfVvM5JWR5CTIM63iWY%3D'
const mySWID = '{2690D5F2-9AD4-4259-90D5-F29AD4525943}'
const seasonYear = 2019;
const leagueId = 564127;
const current_week = 8;
myClient.setCookies({ espnS2: myEspns2, SWID: mySWID });

main();
// tryingAsync();
function getSortedScoresByWeek(schedule) {
    const playedGames = schedule.filter((matchup) => {
        return matchup.winner != 'UNDECIDED'; //&& matchup.matchupPeriodId < 3;
    }).map((matchup) => {
        return {
            "matchupPeriodId": matchup.matchupPeriodId,
            "scores":[{"teamId": matchup.home.teamId, "score":matchup.home.totalPoints},
                      {"teamId": matchup.away.teamId, "score":matchup.away.totalPoints}]
        };
    }).reduce((acc, matchup) => {
        acc[matchup.matchupPeriodId] = matchup.matchupPeriodId in acc ? acc[matchup.matchupPeriodId].concat(...matchup.scores) : matchup.scores;
        return acc;
    },{});
    
    // sort each week's scores descending
    Object.keys(playedGames).forEach( (week) => {
        playedGames[week] = playedGames[week].sort((a,b) => a.score < b.score ? 1 : -1);
    });
    // console.log(playedGames);
    return playedGames;
}

// current method of making API call EACH WEEK via getBoxScoreforWeek TOO MUCH/slow, need just 1 API call... see below
//make a axios.get HTTP call to "http://fantasy.espn.com/apis/v3/games/ffl/seasons/2019/segments/0/leagues/564127/?view=mMatchupScore&view=modular"
// "schedule" is the field that has al lof the matchups
// look for already played weeks... where "winner" != "UNDECIDED"
// 
async function getLeagueData() {
    const routeBase = `http://fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonYear}/segments/0/leagues/${leagueId}/`;
    const routeParams = "?view=mTeam&view=mMatchupScore&view=modular";
    const route = "".concat(routeBase, routeParams);
    try {
        const response  = await axios.get(route, { 
            headers: {
                Cookie: `espn_s2=${myEspns2}; SWID=${mySWID};`
            }
        });
        return response.data;
    } catch (error) {
        console.log(error.response.data);
        return "error haha";
    }
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
    const leagueData = await getLeagueData();
    let simulatedTeams = {};
    leagueData.teams.forEach( (team) => {
        team.cache;
        let tempTeam = new simTeam(team.id, team.location.concat(" " + team.nickname), team.abbrev);
        simulatedTeams[team.id] = tempTeam;
        simulatedTeams[team.id].totalPoints = team.points.toFixed(2);
    });
    const playedGames = getSortedScoresByWeek(leagueData.schedule); //{week1: [{teamId:x, score:x-desc. order }, ...] week2:...}
    // console.log(playedGames);
    Object.keys(playedGames).forEach( (week) => {
        const weekScores = playedGames[week];
        for (let i=0;i<weekScores.length;i++) {
            const team = weekScores[i];
            let fOffset = 1;
            let bOffset = 1;
            while (i + fOffset < weekScores.length && weekScores[i + fOffset].score == weekScores[i].score) {
                fOffset++;
            }
            while (i - bOffset >= 0 && weekScores[i - bOffset].score == weekScores[i].score) {
                bOffset++;
            }
            simulatedTeams[team.teamId].wins += weekScores.length - i - 1 - (fOffset - 1);
            simulatedTeams[team.teamId].losses += i - (bOffset - 1);
            simulatedTeams[team.teamId].ties += (fOffset - 1) + (bOffset - 1);
        }
    });
    // console.log(simulatedTeams);
    let sortedTeams = [];
    Object.keys(simulatedTeams).forEach( (id) => {
        sortedTeams.push(simulatedTeams[id]);
    });
    sortedTeams.sort((a,b) => a.wins < b.wins ? 1 : -1);
    sortedTeams.forEach( (team) => {
        let output = `${team.name}: ${team.wins}-${team.losses}`;
        if (team.ties > 0) output.concat(`-${team.ties}`);
        console.log(output);
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


