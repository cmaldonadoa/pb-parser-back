
from calculator import Calculator
import sys

formula = sys.argv[1]

solver = Calculator.parse(formula)

if solver.find("None") < 0:
    print(solver)
else:
    print("ERROR")
