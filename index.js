"use strict"

import initPrompt from "prompt-sync";
import fs from "fs";
import os from "os";
import path from "path";

const prompt = initPrompt();

function all_true(a, b) {
    return a && b;
}

/*Returns true if the given character is between '0' and '9'
   c is assumed to be a string of length */
function is_numeric(c) {
    return "0" <= c && c <= "9";
}

//Returns True if the given string consists of only the digits 0-9
function is_string_numeric(s) {
    /*First, make a list of which symbols in the given string are numeric (map)
    Then determine if that list is a sequence of only True values (reduce)*/
    let mi_lista = Array.from(s).map(is_numeric);
    return mi_lista.reduce(all_true);
}

/*Generate a random code string of the given length.
   Codes consist of the digits 0-9 in any position.
   (010, 007, and 000 are all possible codes.)*/
function make_code(len) {
    let code = "";
    for (let _ = 0; _ < len; _++) {
        code += Math.floor(Math.random() * 10);
    }
    return code;
}

//Recursively prompt the player for a guess
function get_guess(code_length) {
    let guess = prompt("Guess the code: ");
    if (guess.length != code_length) {
        console.log(`You must enter ${code_length} numbers`);
        return get_guess(code_length);
    } else if (!is_string_numeric(guess)) {
        console.log("The code may contain only numbers");
        return get_guess(code_length);
    }
    return guess;
}

/*Returns a tuple (M,S) where M (matches) is the number of symbols in the player's guess
    that are both correct and in the correct position and S (semi-matches) is the number of
    symbols in the player's guess that are correct, but NOT in the correct position.
    It is assumed that code and guess are strings.*/
function count_matches(code, guess) {
    //First, convert the strings into lists, which are mutable (we will take advantage of this fact)
    let code_numbers = Array.from(code);
    let guess_numbers = Array.from(guess);
    let objeto = {
        num_matches: 0,
        num_semi_matches: 0
    };
    //Find the exact matches first
    for (let i in code_numbers) {
        //Any given position that has the same symbol in both the code and the guess is an exact match
        if (code_numbers[i] == guess_numbers[i]) {
            //Mark matches in the lists of numbers so we don 't double-match any of them
            code_numbers[i] = "-";
            guess_numbers[i] = "-";
            objeto.num_matches++;
        }
    }
    /*Now determine if there are any semi - matches, ignoring any symbols
    for which we have already# identified an exact match*/
    for (let g in guess_numbers) {
        //Skip any guess numbers we 've already matched
        if (guess_numbers[g] == "-") {
            continue;
        }
        /*We need to compare ALL the symbols in the code with each symbol in the guess#
         because a semi-match means the guess symbol is somewhere in the code
        but not in the same position as it is in the guess*/
        for (let n in code_numbers) {
            let c = code_numbers[n];
            //Skip any code numbers we 've already matched
            if (c == "-") {
                continue;
            } else if (guess_numbers[g] == c) {
                //Once a code symbol has been matched, mark it so it doesn 't get double-matched
                code_numbers[n] = "-";
                objeto.num_semi_matches++;
                break;
            }
        }
    }
    return objeto;
}

function get_code_length() {
    //Recursively prompt the user for a numeric code length
    let response = prompt("How long do you want the code to be? ");
    if (!is_string_numeric(response)) {
        console.log("You must enter a number");
        return get_code_length();
    }
    let n = Number(response);
    if (n < 2) {
        console.log("You must choose a number greater than 1");
        return get_code_length();
    }
    return n;
}

//Play one round of CODEBREAKER, and then update the game history file.
function play_round() {
    //First, get the player's desired code length
    let code_length = get_code_length();
    //Print a bit of info about the player's history at this code length
    let history = load_history();
    if (Object.keys(history).includes(String(code_length))) {
        //let value = Object.values(history.String(code_length))//BUG!!//??
        let value = history[code_length]
        console.log(`The number of times you have tried codes of length ${code_length} is ${value[0]}.  Your average and best number of guesses are ${value[1]} and ${value[2]}, respectively.`);
    } else {
        console.log(`This is your first time trying a code of length ${code_length}`);
    }
    //Generate a new random code
    let code = make_code(code_length);
    //UNCOMMENT ME!
    console.log(code);
    //Repeatedly prompt the player for guesses and give them the appropriate feedback after each guess
    let num_guesses = 0
    while (true) {
        num_guesses++;
        let guess = get_guess(code_length);
        if (guess == code) {
            console.log(`You cracked the code!  Number of guesses: ${num_guesses}`);
            update_history(history, code_length, num_guesses);
            return
        } else {
            let match_result = count_matches(code, guess);
            console.log(`${"⭐".repeat(match_result.num_matches)}  ${"⭕".repeat(match_result.num_semi_matches)}  ${"➖".repeat(code_length - match_result.num_matches - match_result.num_semi_matches)}`);
            //console.log(`${"★".repeat(match_result.num_matches)}  ${"☆".repeat(match_result.num_semi_matches)}  ${"-".repeat(code_length - match_result.num_matches - match_result.num_semi_matches)}`);
            //ICON/CHARACTER???
        }
    }
}

/*"Returns the path to the history file used by the game.
 The path is to a file named 'CODEBREAKER.history' in the users' home directory */
function get_history_path() {
    return path.join(os.homedir(), "CODEBREAKER.history");
}

/*Writes the given history out to the history file in the format described in the
load_history function*/
function write_history(history) {
    let history_path = get_history_path();
    if (fs.existsSync(history_path)) {
        try {
            //See the load_history docstring for a description of the line format here
            let arrayVacia = [];
            Object.keys(history).forEach((key) => {
                let data = Object.values(history[key]);
                let scoreString = `${key}:${data[0]}:${data[1]}:${data[2]}`;
                arrayVacia.push(scoreString);
                fs.writeFileSync(history_path, arrayVacia.join(os.EOL));
            });
        } catch {
            console.log("Uh oh, the history file couldn't be updated");
        }
    }
}

/*Updates the given history dict such that the best and average scores for
the given code_length entry incorporate the given num_guesses*/
function update_history(history, code_length, num_guesses) {
    let num_games, best, average;
    if (code_length in history) {
        //Get the current stats for the given code length
        [num_games, best, average] = history[code_length];
        //Print an appropriate message if the player did well
        if (num_guesses < best) {
            console.log(`${num_guesses} is a new best score for codes of length ${code_length}!`);
            //Update the best score if the player did better than the previous best
            best = num_guesses;
        } else if (num_guesses < average) {
            console.log(`${num_guesses} is better than your average score of ${average} for codes of length ${code_length}`);
        }
        /*Calculate the new average score, factoring in the previous average, the number of games
        and the new given score*/
        average = ((average * num_games) + num_guesses) / (num_games + 1);
        /*Update the number of games
        IMPORTANT: This MUST come after the new_average calculation because that calculation
        assumes that num_games has not yet been updated.*/
        num_games++;
        //Update the history for the given code length with the new stats we've calculated
        history[code_length] = [num_games, best, average];
    } else {
        history[code_length] = [1, num_guesses, num_guesses];
    }
    write_history(history);
}

/*Reads the history file into a dictionary and returns the dictionary.
   The file is assumed to contain a set of lines formatted as L:N:B:A
   where L, N, B, A are the code length, number of games at that code length,
   the best score (lowest number of guesses) for that code length, and the
   average score (average number of guesses) for that code length.

   The resultant dictionary has the different values for L as its keys, and
   the value for each key is an (N,B,A) tuple. */
function load_history() {
    let history_path = get_history_path();
    let history = new Map();
    if (fs.existsSync(history_path)) {
        try {
            let contents = fs.readFileSync(history_path).toString().split("\n");
            for (const line of contents) {
                let code_length, num_games, best, average;
                [code_length, num_games, best, average] = line.split(":")
                history[Number(code_length)] = [Number(num_games), Number(best), parseFloat(average).toFixed(2)]; //.map(line => line.trim());
            }
        } catch (e) {
            console.log("Uh oh, your history file could not be read");
        }
    } else {
        fs.open(history_path, "w+", function (err) {
            if (err) {
                console.log("Uh oh, I couldn't create a history file for you");
            }
        })
    }
    return history;
}

//Checks for the current scores logged in the CODEBREAKER.history
function print_scores() {
    let history_path = get_history_path();
    let score = new Map();
    if (fs.existsSync(history_path)) {
        try {
            let contents = fs.readFileSync(history_path).toString().split("\n");
            for (const line of contents) {
                let code_length, num_games, best, average;
                [code_length, num_games, best, average] = line.split(":")
                score[Number(code_length)] = {num_games:Number(num_games), best:Number(best), average:parseFloat(average)};
            }
            console.log("Highest scores by code length! 🏆"); //&#127942)
            console.log(score);
        } catch (e) {
            console.log("Uh oh, your history file could not be read");
        }
    } else {
        console.log("Uh oh, You haven't play any game. Try one!");
    }
}

//Instructions
function print_instructions() {
    console.log("You select a code length. The computer will pick a random numeric code of that length.  You then try to guess the code.  On every guess, the computer will tell you how many numbers in your guess are both the correct number and in the correct position (★) and how many are the correct number but not in the correct position (☆).  Using this information, you should eventually be able to deduce the correct code!");
}

/*Recursively prompts the user to select one of the main menu options */
function get_main_menu_selection() {
    console.log();
    console.log("What do you want to do?");
    console.log("(i) Show instructions");
    console.log("(s) High scores")
    console.log("(p) Play a game");
    console.log("(q) Quit");

    let response = prompt("");
    switch (response) {
        case "i":
            print_instructions();
            break;
        case "s":
            print_scores();
            break;
        case "p":
            console.log("play ROUND")
            play_round();
            break;

        case "q":
            console.log("Ok bye!");
            process.exit(0);

        default:
            console.log("I don't understand...");
    }
    get_main_menu_selection();
}

function init() {
    console.log("CODE⚡BREAKER")
    get_main_menu_selection();
}

init();