
from calculator import Calculator
import sys

formula = sys.argv[1]

solver = Calculator.parse(formula)

if solver:  # If solver contains None?
    print(solver)
else:
    print("ERROR")
