# Relational Comparison

This folder shows how the same logical event data might look in a normalized SQL model.

The project does not claim Cassandra is universally better. SQL is often a better fit for arbitrary joins, ad hoc filtering, global sorting, and reporting. Cassandra is useful here because the application has predictable high-volume queries that can be served from bounded partitions.
