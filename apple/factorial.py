def factorial(n):
    if n == 0:
        return 1
    else:
        return n * factorial(n-1)

# Example usage:
print(factorial(5))


# Dynamic input
n = int(input("Enter a number to calculate its factorial: "))
print(f"Factorial of {n} is {factorial(n)}")