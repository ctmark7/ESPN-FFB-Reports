const { Client, Team, BoxScore} = require('espn-fantasy-football-api/node-dev');

const myClient = new Client({ leagueId: 564127 });
const myEspns2 = 'AEAhcHpaQrwFj9PFxcPnkBzat3IbrqJuKYi%2B4UseqG5zZ8NnyYYa2WTURjO2LGwpK2nUnk8VJLQlpW6y8dNPgmjjfxuarOLRP%2B5z0diP0Zh%2B3PlnjTV3ooDsqwkUs7DDngkNWZpp2cl%2BrrrHETkYX3a9SVLX2AUoui6GABkDaKkh78f9pd5XJ0rFpwEtN%2BrDR%2FMRGQD%2FbLPs2UcaofWglevjwpV9t1wUms%2BdEPpe1m3COkIqIfVvM5JWR5CTIM63iWY%3D'
const mySWID = '{2690D5F2-9AD4-4259-90D5-F29AD4525943}'
myClient.setCookies({ espnS2: myEspns2, SWID: mySWID });

myClient.getTeamsAtWeek({ seasonId: 2019, scoringPeriodId: 1 }).then((teams) => {
    teams.forEach( (team) => {
        team.cache;
        // console.log(team.name, team.getCacheId());
    });
    // console.log("============================================");
}).then(
    myClient.getBoxscoreForWeek({ seasonId: 2019, scoringPeriodId: 1, matchupPeriodId: 1 }).then((boxscores) => {
        boxscores.forEach( (boxscore) => {
            if (boxscore.homeTeamId != 0 ) {
                getCachedTeams(boxscore, printScores);
            }
        });
        // console.log("============================================");
    }).catch( (error) => console.error(error)));

function getCachedTeams(boxscore, callback) {
    homeTeam = Team.get(`id=${boxscore.homeTeamId};leagueId=564127;seasonId=2019;`);
    awayTeam = Team.get(`id=${boxscore.awayTeamId};leagueId=564127;seasonId=2019;`);
    console.log(homeTeam.abbreviation, awayTeam.abbreviation);
    callback(homeTeam, awayTeam, boxscore);
}
function printScores(homeTeam, awayTeam, boxscore) {
    // console.log(boxscore.homeRoster[5].player.fullName,boxscore.homeRoster[5].totalPoints, roundPlayerScore(boxscore.homeRoster[5]));
    console.log(`2018 Score: ${homeTeam.name}: ${roundStarters(boxscore.homeRoster)}--${roundStarters(boxscore.awayRoster)} :${awayTeam.name}`);
    console.log(`2019 Score: ${homeTeam.name}: ${boxscore.homeScore}--${boxscore.awayScore} :${awayTeam.name}`);  
}
// takes in array of BoxscorePlayers
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