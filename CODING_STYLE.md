Classes will accept state as arguments and will not have any state on their own.
Class objects can be chained and will be chained to always return themselves.
That way we can chain multiple functions together into a single call.

Stateless objects should not have functions.
This will make them easy to serialize and save in data files.
States are immutable and will always return shallow copies when they are changed.

When creating new classes and states, use as few optional fields as possible.
This reduces the number of undefined checks needed.
