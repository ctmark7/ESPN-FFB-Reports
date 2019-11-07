const { Client, Team, BoxScore} = require('espn-fantasy-football-api/node-dev');
const axios = require('axios');
const myClient = new Client({ leagueId: 564127 });
const myEspns2 = 'AEAhcHpaQrwFj9PFxcPnkBzat3IbrqJuKYi%2B4UseqG5zZ8NnyYYa2WTURjO2LGwpK2nUnk8VJLQlpW6y8dNPgmjjfxuarOLRP%2B5z0diP0Zh%2B3PlnjTV3ooDsqwkUs7DDngkNWZpp2cl%2BrrrHETkYX3a9SVLX2AUoui6GABkDaKkh78f9pd5XJ0rFpwEtN%2BrDR%2FMRGQD%2FbLPs2UcaofWglevjwpV9t1wUms%2BdEPpe1m3COkIqIfVvM5JWR5CTIM63iWY%3D'
const mySWID = '{2690D5F2-9AD4-4259-90D5-F29AD4525943}'
const seasonYear = 2019;
const leagueId = 564127; //912570;
const current_week = 9;
myClient.setCookies({ espnS2: myEspns2, SWID: mySWID });

// main();
getBoxScoresForWeek(9);
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
        if (matchup.matchupPeriodId in acc) {
            acc[matchup.matchupPeriodId] = acc[matchup.matchupPeriodId].concat(...matchup.scores)
        }
        else {
            acc[matchup.matchupPeriodId] = matchup.scores;
        }
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
            this.weeklyRecord = {} // {week1: {wins:n,losses:n,ties:n}, week2:{wins:...,...}, ...}
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
            const simulatedWeek = { 
                "wins": weekScores.length - i - 1 - (fOffset - 1),
                "losses": i - (bOffset - 1),
                "ties": (fOffset - 1) + (bOffset - 1)
            };
            simulatedTeams[team.teamId].weeklyRecord[week] = simulatedWeek;
            simulatedTeams[team.teamId].wins += simulatedWeek.wins;
            simulatedTeams[team.teamId].losses += simulatedWeek.losses;
            simulatedTeams[team.teamId].ties += simulatedWeek.ties;
        }
    });
    // console.log(simulatedTeams);
    let sortedTeams = Object.keys(simulatedTeams).map( (id) => {
        return simulatedTeams[id];
    }).sort((a,b) => a.wins < b.wins ? 1 : -1)
    .forEach( (team) => {
        let output = `${team.name}: ${team.wins}-${team.losses}`;
        if (team.ties > 0) {
            output = output.concat(`-${team.ties}`);
        }
        console.log(output);
    });
    // console.log('\n');
    // console.log(simulatedTeams[13].name,simulatedTeams[13].weeklyRecord); //shane
    // console.log(simulatedTeams[9].name, simulatedTeams[9].weeklyRecord); //brendan
    }

async function getBoxScoresForWeek(week) {
        const leagueData = await getLeagueData();
        const teamData = leagueData.teams.reduce( (acc,team) => {
            acc[team.id] = {"name": team.location.concat(" "+team.nickname), "abbrev":team.abbrev};
            return acc;
        }, {});
        const boxscores = await myClient.getBoxscoreForWeek({ seasonId: seasonYear, scoringPeriodId: week, matchupPeriodId: week });
        console.log(`=================== Week ${week} Scores ===================`);
        boxscores.forEach( (boxscore) => {
            const homeOptimalRoster = maxTeamScore(boxscore.homeRoster);
            const awayOptimalRoster = maxTeamScore(boxscore.awayRoster);
            // console.log(homeOptimalRoster, awayOptimalRoster);
            console.log(`===== ${teamData[boxscore.homeTeamId].abbrev} vs. ${teamData[boxscore.awayTeamId].abbrev} =====`);
            console.log("Actual Score:        " + boxscore.homeScore + ' - ' + boxscore.awayScore);
            console.log("Max Possible Scores: " + sumStarters(homeOptimalRoster) + ' - ' + sumStarters(awayOptimalRoster));
            const homeRoundRoster = roundStarters(boxscore.homeRoster);
            const awayRoundRoster = roundStarters(boxscore.awayRoster);
            console.log(`2018 Score:             ${sumRoster(homeRoundRoster)} - ${sumRoster(awayRoundRoster)}\n`);
            // if (teamData[boxscore.homeTeamId].abbrev == 'DDC' || teamData[boxscore.homeTeamId].abbrev == 'WIN') {
            //     for (i=0; i < homeRoundRoster.length;i++) {
            //         console.log(`${homeRoundRoster[i].player}:  ${homeRoundRoster[i].roundedScore}      -----       ${awayRoundRoster[i].roundedScore} :${awayRoundRoster[i].player}`);
            //     };
            // }
            // console.log("\n");
            // console.log("============================================");
        });
}

async function getCachedTeams(boxscore, callback) {
    const homeTeam = await Team.get(`id=${boxscore.homeTeamId};leagueId=${leagueId};seasonId=${seasonYear};`);
    const awayTeam = await Team.get(`id=${boxscore.awayTeamId};leagueId=${leagueId};seasonId=${seasonYear};`);
    // if (!homeTeam && !awayTeam) console.log(Team.cache);
    callback(homeTeam, awayTeam, boxscore);
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
    let roundedRoster = [];
    roster.forEach( (player) => {
        if (player.position != 'Bench') {
            const roundScore = roundPlayerScore(player)
            roundedTotal += roundScore;
            roundedRoster.push({"player":player.player.firstName + " " + player.player.lastName, "roundedScore":roundScore});
        }
    });
    // console.log(roundedRoster);
    return roundedRoster
}

function sumRoster(roundRoster) {
    let sum = roundRoster.reduce( (acc,player) => {
        acc += player.roundedScore;
        return acc;
    }, 0);
    return sum;
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


