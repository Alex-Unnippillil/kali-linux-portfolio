# radare2 guided script: basics
# Step 1: open the demo binary
o demo.bin
# Step 2: analyze everything
aaa
# Step 3: print disassembly of main
pdf @ main
# Step 4: list strings
iz
