certoraRun certora/harness/BridgeHarness.sol \
        certora/harness/BridgeL2Harness.sol \
        certora/harness/DummyERC20UnderlyingA_L1.sol \
        certora/harness/DummyERC20UnderlyingB_L1.sol \
        certora/harness/ATokenWithPoolA_L1.sol \
        certora/harness/ATokenWithPoolB_L1.sol \
        certora/harness/StaticATokenA_L2.sol \
        certora/harness/StaticATokenB_L2.sol \
        certora/harness/DummyERC20RewardToken.sol \
        certora/harness/SymbolicLendingPoolL1.sol \
        certora/harness/IncentivesControllerMock_L1.sol \
        \
        --verify BridgeHarness:certora/specs/bridgeConstIndex.spec \
        --link BridgeHarness:_rewardToken=DummyERC20RewardToken \
                    BridgeHarness:_incentivesController=IncentivesControllerMock_L1 \
                    BridgeHarness:BRIDGE_L2=BridgeL2Harness \
                    IncentivesControllerMock_L1:_rewardToken=DummyERC20RewardToken \
                    ATokenWithPoolA_L1:POOL=SymbolicLendingPoolL1 \
                    ATokenWithPoolA_L1:_incentivesController=IncentivesControllerMock_L1 \
                    ATokenWithPoolB_L1:POOL=SymbolicLendingPoolL1 \
                    ATokenWithPoolB_L1:_incentivesController=IncentivesControllerMock_L1 \
                    BridgeL2Harness:BRIDGE_L1=BridgeHarness \
                    BridgeL2Harness:REW_AAVE=DummyERC20RewardToken \
        --solc solc8.10 \
        --optimistic_loop \
        --loop_iter 3 \
        --settings -mediumTimeout=700,-depth=12 \
        --rules $1 $2 $3 $4 $5 $6 $7 $8 $9 ${10} ${11} ${12} ${13} ${14} ${15} ${16} \
        --cloud \
        --msg "AAVE S-Net BridgeConstIndex"

# The first lines (#1-#11) specifies all the contracts that are being called through the BridgeHarness.sol file.
# This is a declaration of multiple contracts for the verification context.

# Line #13 is of the form --verify Contract:SPEC, and it is a specification of the main contract to be verified and the spec file to check this contract against.

# The next lines (#14-#23) are under the --link flag which specifies links for vars/contracts which are instances of other contracts.
# It's written in the form: < Contract_Where_The_Instance_Appear > : < Name_Of_Instance_Var_In_This_Contract > : < Target_Contract_To_Link_The_Calls_To >

# The --solc flag specifies the solc that the prover needs to use in verification. It has to be correlated with the pragma line of the contract.
# The value solc8.10 is merely the name of the actual compiler file. In this case the containing directory is in $PATH.

# The --optimistic_loop flag assumes loops are executed well and nicely, even if in practice no full unrolling of the loop is being done.
# This means that a if loop of, say, fixed size 5 is in the code, and we unroll it 1 time, meaning we only execute 1 iteration, we assume that the loop condition was not breached even without executing the entire thing.

# The --loop_iter flag specifies the number of times the tool unroll loops when running (can be thought of as the number of iterations executed).
# Here we need to specify a loop_iter of 2 due to the way that the tool treat dynamic types as arrays.