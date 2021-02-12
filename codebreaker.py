import os

from functools import reduce
from random import randint

def all_true(a, b):
    return a and b

def is_numeric(c):
    """Returns true if the given character is between '0' and '9'
        c is assumed to be a string of length 1
    """
    return "0" <= c and c <= "9"

def is_string_numeric(s):
    """Returns True if the given string consists of only the digits 0-9"""

    # First, make a list of which symbols in the given string are numeric (map)
    # Then determine if that list is a sequence of only True values (reduce)
    return reduce(all_true, map(is_numeric, s))

def make_code(length):
    """Generate a random code string of the given length.
       Codes consist of the digits 0-9 in any position.
       (010, 007, and 000 are all possible codes.)
    """

    code = ""
    for _ in range(length):
        code += str(randint(0,9))

    return code

def get_guess(code_length):
    """Recursively prompt the player for a guess"""

    guess = input("Guess the code: ")

    if len(guess) != code_length:
        print(f"You must enter {code_length} numbers")
        return get_guess(code_length)

    if not is_string_numeric(guess):
        print("The code may contain only numbers")
        return get_guess(code_length)

    return guess

def count_matches(code, guess):
    """Returns a tuple (M,S) where M (matches) is the number of symbols in the player's guess
       that are both correct and in the correct position and S (semi-matches) is the number of
       symbols in the player's guess that are correct, but NOT in the correct position.
       It is assumed that code and guess are strings.
    """

    # First, convert the strings into lists, which are mutable (we will take advantage of this fact)
    code_numbers = list(code)
    guess_numbers = list(guess)

    num_matches = 0
    num_semi_matches = 0

    # Find the exact matches first
    for i in range(len(code_numbers)):
        # Any given position that has the same symbol in both the code and the guess is an exact match
        if code_numbers[i] == guess_numbers[i]:
            # Mark matches in the lists of numbers so we don't double-match any of them
            code_numbers[i] = "-"
            guess_numbers[i] = "-"
            num_matches += 1

    # Now determine if there are any semi-matches, ignoring any symbols for which we have already
    # identified an exact match
    for g in guess_numbers:

        # Skip any guess numbers we've already matched
        if g == "-":
            continue

        # We need to compare ALL the symbols in the code with each symbol in the guess
        # because a a semi-match means the guess symbol is somewhere in the code but not
        # in the same position as it is in the guess
        for i in range(len(code_numbers)):
            c = code_numbers[i]

            # Skip any code numbers we've already matched
            if c == "-":
                continue

            if g == c :
                # Once a code symbol has been matched, mark it so it doesn't get double-matched
                code_numbers[i] = "-"
                num_semi_matches += 1
                break

    return (num_matches, num_semi_matches)

def get_code_length():
    """Recursively prompt the user for a numeric code length"""

    response = input("How long do you want the code to be? ")

    if not is_string_numeric(response):
        print("You must enter a number")
        return get_code_length()

    n = int(response)

    if n < 2:
        print("You must choose a number greater than 1")
        return get_code_length()

    return n

def play_round():
    """Play one round of CODEBREAKER, and then update the game history file."""

    # First, get the player's desired code length
    code_length = get_code_length()

    # Print a bit of info about the player's history at this code length
    history = load_history()
    if code_length in history:
        (num_games, best, average) = history[code_length]
        print(f"The number of times you have tried codes of length {code_length} is {num_games}.  Your average and best number of guesses are {average} and {best}, respectively.")
    else:
        print(f"This is your first time trying a code of length {code_length}")

    # Generate a new random code
    code = make_code(code_length)

    # Uncomment this print statement if you want to see the code for debugging purposes
    print(code)

    # Repeatedly prompt the player for guesses and give them the appropriate feedback after each guess
    num_guesses = 0
    while True:
        num_guesses += 1

        guess = get_guess(code_length)

        if guess == code :
            print(f"You cracked the code!  Number of guesses: {num_guesses}")
            update_history(history, code_length, num_guesses)
            return

        else:
            (num_matches, num_semi_matches) = count_matches(code, guess)
            print("★"*num_matches + "☆"*num_semi_matches + "-"*(code_length-num_matches-num_semi_matches))

def get_history_path():
    """Returns the path to the history file used by the game.
       The path is to a file named 'CODEBREAKER.history' in the users' home directory"""
    return os.path.join(os.path.expanduser("~"), "CODEBREAKER.history")

def write_history(history):
    """Writes the given history out to the history file in the format described in the
       load_history function"""

    history_path = get_history_path()
    if os.path.exists(history_path):
        try:
            with open(history_path, "w") as f:
                for (code_length, data) in history.items():
                    # See the load_history docstring for a description of the line format here
                    f.write(f"{code_length}:{data[0]}:{data[1]}:{data[2]}"+ os.linesep)
        except:
            print("Uh oh, the history file couldn't be updated")

def update_history(history, code_length, num_guesses):
    """Updates the given history dict such that the best and average scores for
       the given code_length entry incorporate the given num_guesses"""

    if code_length in history:
        # Get the current stats for the given code length
        (num_games, best, average) = history[code_length]

        # Print an appropriate message if the player did well
        if num_guesses < best:
            print(f"{num_guesses} is a new best score for codes of length {code_length}!")
            # Update the best score if the player did better than the previous best
            best = num_guesses
        elif num_guesses < average:
            print(f"{num_guesses} is better than your average score of {average} for codes of length {code_length}!")

        # Calculate the new average score, factoring in the previous average, the number of games
        # and the new given score
        average = ((average * num_games) + num_guesses) / (num_games + 1)

        # Update the number of games
        # IMPORTANT: This MUST come after the new_average calculation because that calculation
        # assumes that num_games has not yet been updated.
        num_games += 1

        # Update the history for the given code length with the new stats we've calculated
        history[code_length] = (num_games, best, average)
    else:
        # If the given code_length is not already in the history
        # just add a new entry; this was the first game at that code length
        history[code_length] = (1, num_guesses, num_guesses)

    write_history(history)

def load_history():
    """Reads the history file into a dictionary and returns the dictionary.
       The file is assumed to contain a set of lines formatted as L:N:B:A
       where L, N, B, A are the code length, number of games at that code length,
       the best score (lowest number of guesses) for that code length, and the
       average score (average number of guesses) for that code length.

       The resultant dictionary has the different values for L as its keys, and
       the value for each key is an (N,B,A) tuple.
    """
    history_path = get_history_path()

    history = {};

    if os.path.exists(history_path):
        try:
            with open(history_path) as f:
                for line in f.readlines():
                    (code_length, num_games, best, average) = line.split(":")
                    history[int(code_length)] = (int(num_games), int(best), float(average))
        except:
            print("Uh oh, your history file could not be read")

    else:
        try:
            # Make an empty history file if there's not already one present
            f = open(history_path, "w")
            f.close()
        except:
            print("Uh oh, I couldn't create a history file for you")

    return history

def print_instructions():
    print("You select a code length.  The computer will pick a random numeric code of that length.  You then try to guess the code.  On every guess, the computer will tell you how many numbers in your guess are both the correct number and in the correct position (★) and how many are the correct number but not in the correct position (☆).  Using this information, you should eventually be able to deduce the correct code!")

def get_main_menu_selection():
    """Recursively prompts the user to select one of the main menu options"""

    print()
    print("What do you want to do?")
    print("(i) Show instructions")
    print("(p) Play a game")
    print("(q) Quit")

    response = input("")

    if response == "i":
        print_instructions()
    elif response == "p":
        play_round()
    elif response == "q":
        print("Ok bye!")
        exit(0)
    else:
        print("I don't understand...")

    get_main_menu_selection()

def init():
    print("CODE⚡BREAKER")
    get_main_menu_selection()

init()
